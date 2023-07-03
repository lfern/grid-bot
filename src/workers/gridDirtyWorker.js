const { default: ccxt } = require('ccxt');
const { InstanceRepository } = require('../../repository/InstanceRepository');
const { StrategyInstanceRecoveryGridRepository, PHASE_DOWNLOADING, PHASE_FIXING } = require('../../repository/StrategyInstanceRecoveryGridRepository');
const { BaseExchangeCcxtOrder } = require('../crypto/exchanges/ccxt/BaseExchangeCcxtOrder');
const { GridManager } = require('../grid/grid');
const { exchangeInstanceWithMarketsFromAccount } = require('../services/ExchangeMarket');
const GridDirtyEventService = require('../services/GridDirtyEventService');
const LockService = require('../services/LockService');
const GridNoFundsEventService = require('../services/GridNoFundsEventService');
const { StrategyInstanceEventRepository, LEVEL_ERROR, LEVEL_CRITICAL, LEVEL_WARN } = require('../../repository/StrategyInstanceEventRepository');
const notificationEventService = require('../services/NotificationEventService');

const recoveryRepository = new StrategyInstanceRecoveryGridRepository();
const instanceRepository = new InstanceRepository();
const eventRepository = new StrategyInstanceEventRepository();

/**
 * Three phases: initializing, downloading, fixing, exchange, checking
 * - Downloading: download orders from the oldest open order in grid's
 *   order table or since last order downloaded in previous download phase.
 *   We add a null entry in the table to indicate we downloaded or orders from 
 *   exchange.
 * - Fixing: We process orders one by one and try to apply to the grid. We
 *   don't cancel any order, just try to add the "other" order in the grid
 *   and create in the exchange. When no other orders are pending, go to next phase
 * - Checking: check if grid is ok: no price gaps except one and no duplicated orders 
 *   with the same price. if we created any order maybe those orders has been executed inmediately,
 *   so go to download phase again. Else we close the grid and send an event to the user.
 * 
 * @param {*} job 
 * @param {*} done 
 * @returns 
 */
exports.gridDirtyWorker = async (job, done) => {

    // then get orders from oldest open order timestamp in our database (creation_datetime)
    // and fill temporal table (one REST request at a time) How to know there are no more orders

    let grid = job.data;
    console.log("GridDirtyWorker: checking grid", grid);

    /*
    if (1 == 1) {
        console.log("RECOVER IS DISABLED FOR NOW");
        notificationEventService.send("Not implemented", LEVEL_WARN, "RECOVER GRID PROCESS IS DISABLED FOR NOW!!");
        done(null, { message: "grid dirty worker event executed" });
        return;
    }
    */

    let lock = null;
    let reentry = true;
    try {
        // lock grid
        lock = await LockService.acquire(['grid-instance-' + grid], 60000);
        console.log(`GridDirtyWorker: lock acquired for grid ${grid}`);

        const instance = await instanceRepository.getInstance(grid, true);
        if (instance == null) {
            console.log(`GridDirtyWorker: Instance does not exists ${grid}`);
            reentry = false;
            return;
        }

        if (!instance.running) {
            console.log(`GridDirtyWorker: Instance is not running ${grid}`);
            reentry = false;
            return;
        }

        let status = await recoveryRepository.getCurrentRecoveryPhase(instance.id);

        if (status == PHASE_DOWNLOADING) {
            rentry = await executeDownloadCycle(instance);
        } else if (status == PHASE_FIXING) {
            rentry = await executeFixCycle(instance);
        } else { // PHASE_CHECKING
            rentry = await executeCheckCycle(instance);
        }

    } catch (ex) {
        console.error(`GridDirtyWorker: error handling grid dirty for grid ${grid}:`, ex);
        reentry = false;
    } finally {
        if (lock != null){try {await lock.unlock();} catch(ex){console.error("Error trying to unlock " ,ex);}}
        console.log(`GridDirtyWorker lock released for grid ${grid}`);
        if (reentry) {
            GridDirtyEventService.send(grid);
        }

        done(null, { message: "grid dirty worker event executed" });
    }
}


const executeDownloadCycle = async function (instance) {
    console.log(`GridDirtyWorker: Download orders cycle ${instance.id}`);
    // check if all orders are downloaded from exchange
    let timestamp = await recoveryRepository.getLastOrderTimestamp(instance.id);
    if (timestamp == null) {
        // no orders
        console.log(`GridDirtyWorker: No more orders pending, timestamp == null ${instance.id}`);
        await recoveryRepository.noMoreOrdersPending(instance.id);
        return true;
    }

    console.log(`GridDirtyWorker: Fetching orders from timestamp ${timestamp} for ${instance.id}`);
    let exchange = await exchangeInstanceWithMarketsFromAccount(instance.strategy.account);       
    let orders = await exchange.fetchClosedOrders(instance.strategy.symbol, timestamp);
    if (orders.length == 0 || (orders[orders.length-1].id == orders.id)) {
        // no more new orders from exchange or last order is still downloaded
        console.log(`GridDirtyWorker: No more orders from exchange ${instance.id}`);
        await recoveryRepository.noMoreOrdersPending(grid);
        return true;
    }

    await recoveryRepository.addOrders(instance.id, orders);
    return true;
}

const executeFixCycle = async function(instance) {
    console.log(`GridDirtyWorker: Fixing grid cycle ${instance.id}`);
    // get next executed order
    let nextExecution = await recoveryRepository.getNextExecution(instance.id);
    if (nextExecution == null) {
        // we are not really in this phase go to next
        console.log(`GridDirtyWorker: not really in fixing orders cycle, please check it out because we detected we were really in this phase`);
        return true;
    }

    let nextOrder = BaseExchangeCcxtOrder.fromJson(nextExecution.order);
    console.log(`GridDirtyWorker: Executing order ${nextOrder.id} ${nextOrder.side} ${nextOrder.price} for ${instance.id}`);

    let exchange = await exchangeInstanceWithMarketsFromAccount(instance.strategy.account);
    let gridManager = new GridManager(exchange, instance, instance.strategy);
    let newOrderData = await gridManager.getOtherOrderAfterExecuteOrder(nextOrder);

    if (newOrderData == null) {
        console.log(`GridDirtyWorker: No new order after order ${nextOrder.id} ${nextOrder.side} ${nextOrder.amount} ${nextOrder.price} fixing grid cycle ${instance.id}`);
        nextExecution.status = 'executed';
        await nextExecution.save();
    } else {
        console.log(`GridDirtyWorker: Creating new order after order ${newOrderData.side} ${newOrderData.amount} ${newOrderData.price} fixing grid cycle ${instance.id}`);
        try {
            let order = await exchange.createOrder(
                instance.strategy.symbol,
                'limit',
                newOrderData.side,
                newOrderData.amount,
                newOrderData.price, {
                    leverage: 1 
                }
            );
            // TODO, what to do if program stopped here and order id is not updated in database
            await gridManager.commitOrderExecution(nextOrder, order);
            nextExecution.status = 'executed-order-created';
            await nextExecution.save();
        
        } catch (ex) {
            if (ex instanceof ccxt.InsufficientFunds ||
                ex.message.includes('not enough tradable balance')) {
                console.error(`GridDirtyWorker: No funds error sending order for ${instance.id}. Send NoFunds event`)
                let currency = exchange.currencyNotFoundForMarket(instance.strategy.symbol, newOrderData.side);
                await eventRepository.create(instance, 'OrderSendError', LEVEL_ERROR, ex.message);
                GridNoFundsEventService.send(instance.id, currency);
                return false;
            }
            console.error(`GridDirtyWorker: Error sending order for ${instance.id}`, ex);
            await eventRepository.create(instance, 'OrderSendError', LEVEL_ERROR, ex.message);
            // close grid
            await instanceRepository.stopGrid(instance.id);
            eventRepository.create(
                this.instance, 'GridDirty',
                LEVEL_CRITICAL,
                `Could not recover grid sending order ${ex.message}. Stopping grid!!!`
            );
             
            return false;
        }
    }

    return true;
}

// TODO
const executeCheckCycle = async function(instance) {
    console.log(`GridDirtyWorker: Check grid cycle ${instance.id}`);
    let exchange = await exchangeInstanceWithMarketsFromAccount(instance.strategy.account);
    let gridManager = new GridManager(exchange, instance, instance.strategy);

    let cleanResponse = await gridManager.checkClean();
    if (!cleanResponse.ok) {
        console.error(`GridDirtyWorker: Grid is not clean, check if any order created for ${instance.id}: ${cleanResponse.error}`);
        if (!await recoveryRepository.ordersCreatedLastPhase(instance.id)) {
            // close grid
            console.error(`GridDirtyWorker: No orders created and grid is not clean for ${instance.id}, stopping`);

            await instanceRepository.stopGrid(instance.id);
            eventRepository.create(
                instance, 'GridDirty',
                LEVEL_CRITICAL,
                `Could not recover grid. Stopping grid!!!`
            );

            return false;
        } else {
            console.log(`GridDirtyWorker: Orders created while grid is not clean for ${instance.id}, reset to download orders`);
            await recoveryRepository.resetNoMoreOrdersPending(instance.id);
            return true;
        }
    } else {
        console.log(`GridDirtyWorker: Grid clean, send event to resuming grid for ${instance.id} (PENDING CHECKING PREVIOUS STATUS)`);
        // set grid clean
        await instanceRepository.gridClean(instance.id);
        await recoveryRepository.cleanup();
        // TODO: send event to recover grid: send order ??
        return false;
    }
}