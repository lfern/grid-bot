const { default: BigNumber } = require("bignumber.js");
const { OrderNotFound } = require("ccxt");
const { InstanceAccountRepository } = require("../../repository/InstanceAccountingRepository");
const { InstanceRepository } = require("../../repository/InstanceRepository");
const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");
const { StrategyInstanceEventRepository, LEVEL_CRITICAL } = require("../../repository/StrategyInstanceEventRepository");
const { exchangeInstanceFromAccount } = require("../services/ExchangeMarket");
const NotificationEventService = require("../services/NotificationEventService");
const StopGridEventService = require('../services/StopGridEventService');
const LockService = require('../services/LockService');
const { StrategyInstanceGridRepository } = require("../../repository/StrategyInstanceGridRepository");
const { BaseExchangeCcxtOrder } = require("../crypto/exchanges/ccxt/BaseExchangeCcxtOrder");
const notificationEventService = require("../services/NotificationEventService");

/** @typedef {import("../services/OrderEventService").OrderDataEvent} OrderDataEvent */
/** @typedef {import("../crypto/exchanges/BaseExchange").BaseExchange} BaseExchange*/

let instanceRepository = new InstanceRepository();
let pendingAccountRepository = new PendingAccountRepository();
let instanceAccountRepository = new InstanceAccountRepository();
let eventRepository = new StrategyInstanceEventRepository();
let instanceGridRepository = new StrategyInstanceGridRepository();

/**
 * 
 * @returns 
 */
exports.stopGridWorker = async (job, done) => {
    let grid = job.data;
    console.log("StopGridWorker: stopping grid", grid);

    if (await stopGrid(grid)) {
        // if grid stopped try to cancel or recover orders
        try {
            if (await cancelOrRecoverOrder(grid)) {
                StopGridEventService.send(grid);
            }
        } catch (ex) {
            console.error("StopGridWorker: error canceling or recovering order from grid", grid, ex);
        }
    }

    done(null, { message: "grid dirty worker event executed" });
}

const stopGrid = async function(grid) {
    let lock = null;
    try {
        // lock grid
        lock = await LockService.acquire(['grid-instance-' + grid], 60000);
        console.log(`StopGridWorker: lock acquired for grid ${grid}`);

        let instance = await instanceRepository.getInstance(grid, true);

        if (instance == null) {
            return false;
        }

        // close grid
        if (await instanceRepository.stopGrid(instance.id, true)) {
            await eventRepository.create(
                instance, 'GridStopping',
                LEVEL_CRITICAL,
                `Grid Stopped, init syncing process...`
            );
        } else {
            console.log(`StopGridWorker, Grid already stopped in DB ${grid}`)
        }
        return true;
    } catch (ex) {
        console.error(`StopGridWorker: error stopping grid ${grid}:`, ex);
        NotificationEventService.send("GridDirtyWorker", LEVEL_CRITICAL, `Error stopping grid ${grid} ${ex.message}`);
    } finally {
        if (lock != null){try {await lock.unlock();} catch(ex){
            console.error("StopGridWorker: Error trying to unlock " ,ex);
        }}
        console.log(`StopGridWorker lock released for grid ${grid}`);
    }

    return false;
}

const cancelOrRecoverOrder = async function(grid) {
    let instance = await instanceRepository.getInstance(grid, true);
    if (instance == null || !instance.is_syncing) {
        console.log(`StopGridWorker: instance not found or not syncing`);
        return false;
    }
    
    let account = instance.strategy.account;
    let exchange = await exchangeInstanceFromAccount(account);
    let lock = null;
    try {
        // lock grid
        lock = await LockService.acquire(['grid-instance-' + grid], 60000);
        console.log(`StopGridWorker: lock acquired for grid ${grid}`);

        // Get pending orders ordered by current price
        let gridEntry = await instanceGridRepository.getNextEntryToCancel(grid);
        if (gridEntry != null) {
            console.log(`StopGridWorker: try to cancel order id ${gridEntry.exchange_order_id} for grid ${grid}`);
            await cancelOrder(instance, account, exchange, gridEntry);
            return true;
        } else {
            // find orders not completed
            let dbOrder = await instanceAccountRepository.getNextOrderNotFilled(instance.id);
            if (dbOrder != null) {
                console.log(`StopGridWorker: try recover trades for order id ${dbOrder.exchange_order_id} for grid ${grid}`);
                await recoverOrder(instance, account, exchange, dbOrder);
                return true;
            }
            // no pending orders to be cancelled and all orders ok
            await instanceRepository.gridSynced(grid);
            await eventRepository.create(
                instance, 'GridStopped',
                LEVEL_CRITICAL,
                `Grid Stopped`
            );
        }
    } catch (ex) {
        console.error(`StopGridWorker: error stopping grid ${grid}:`, ex);
        NotificationEventService.send("GridDirtyWorksr", LEVEL_CRITICAL, `Error stopping grid ${grid} ${ex.message}`);
    } finally {
        if (lock != null){try {await lock.unlock();} catch(ex){console.error("StopGridWorker: Error trying to unlock " ,ex);}}
        console.log(`StopGridWorker lock released for grid ${grid}`);
    }
    return false;
};

/**
 * Cancel order and update database
 * 
 * @param {StrategyInstanceModel} instance 
 * @param {AccountModel} account 
 * @param {BaseExchange} exchange 
 * @param {StrategyInstanceGridModel} gridEntry 
 */
const cancelOrder = async function(instance, account, exchange, gridEntry) {
    // get order data
    let order = await instanceAccountRepository.getOrderById(gridEntry.order_id);
    // and remove for pending
    await pendingAccountRepository.removeOrderSymbol(account.id, instance.strategy.symbol, order.exchange_order_id);
    let fetchedOrder = await cancelOrFetchOrder(instance.id, exchange, order.exchange_order_id, instance.strategy.symbol);
    // update order in database and remove order id from grid entry
    // if order status still open, something wrong or exchange takes some time to change order status, try later again
    if (fetchedOrder != null && fetchedOrder.status != 'open') {
        await instanceAccountRepository.updateOrder(account.id, fetchedOrder);
        await gridEntry.update({
            exchange_order_id: null
        });

    }
}

/**
 * Try to cancel order or fetch it if order not found error 
 * 
 * @param {StrategyInstanceModel} instance 
 * @param {BaseExchange} exchange 
 * @param {string} orderId 
 * @param {string} symbol 
 */
const cancelOrFetchOrder = async function(instanceId, exchange, orderId, symbol) {
    let fetchedOrder;
    try {
        // cancel orders
        fetchedOrder = await exchange.cancelOrder(orderId, symbol);
        if (fetchedOrder.status == 'open') {
            fetchedOrder = await exchange.fetchOrder(orderId, symbol);
        }
    } catch (ex) {
        // the order could be cancelled before
        if (ex instanceof OrderNotFound) {
            console.error(`StopGridWorker: Error canceling order ${orderId} ${symbol} for grid ${instanceId} ${ex.message}`);
            fetchedOrder = await exchange.fetchOrder(orderId, symbol);
        } else {
            console.error(`StopGridWorker: Error canceling order ${orderId} for grid ${instanceId}`, ex)
        }
    }

    return fetchedOrder;
}

/**
 * Recover trades for order and try to check filled attribute
 *  
 * @param {StrategyInstance} instance 
 * @param {BaseExchange} exchange 
 * @param {StrategyInstanceOrder} order 
 */
const recoverOrder = async function(instance, account, exchange, dbOrder) {
    // Any order should not be in open status 
    if (dbOrder.status == 'open') {
        console.error(`StopGridWorker: order status still open for ${dbOrder.exchange_order_id} in DB for grid ${instance.id}`);
        //notificationEventService.send(
        //    'SyncingError',
        //    LEVEL_CRITICAL,
        //    `Order still opened in database after syncing stopped instance ${instance.id} order ${dbOrder.exchange_order_id}`
        //);
        //let fetchedOrder = await cancelOrFetchOrder(instance.id, exchange, dbOrder.exchange_order_id, instance.strategy.symbol);
        //if (fetchedOrder != null) {
        //    await instanceAccountRepository.updateOrder(account.id, fetchedOrder);
        //}
    }

    // Get orders trades from exchange
    let trades = await exchange.fetchOrderTrades(dbOrder.exchange_order_id, instance.strategy.symbol);

    // Add Trades to the DB
    let filled = BigNumber(0);
    for (let i=0;i<trades.length;i++) {
        await instanceAccountRepository.createTrade(account.id, trades[i]);
        filled.plus(trades[i].amount);
    }

    // It should be filled, so print error
    if (!filled.eq(dbOrder.amount) || (dbOrder.status != 'open' && dbOrder.status != 'closed' && !filled.eq(dbOrder.filled))) {
        console.error(`StopGridWorker: order not really filled in grid ${instance.id} ${dbOrder.exchange_order_id}. Try to update db filled data`);
        await instanceAccountRepository.tryFixOrderTradesOk(dbOrder.id);
    }  
}