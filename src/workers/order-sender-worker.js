
/** @typedef {import('bull').Queue} Queue */
const { InstanceRepository } = require('../../repository/InstanceRepository');
const { GridManager } = require('../grid/grid');
const {exchangeInstanceWithMarketsFromAccount} = require('../services/ExchangeMarket');
const models = require('../../models');
const { InstanceAccountRepository } = require('../../repository/InstanceAccountingRepository');
const { StrategyInstanceEventRepository, LEVEL_ERROR } = require('../../repository/StrategyInstanceEventRepository');
const OrderSenderEventService = require('../services/OrderSenderEventService');
const LockService = require('../services/LockService');
const { default: ccxt } = require('ccxt');
const gridNoFundsEventService = require('../services/GridNoFundsEventService');

let instanceRepository = new InstanceRepository();
let instanceAccRepository = new InstanceAccountRepository();
let eventRepository = new StrategyInstanceEventRepository();

/**
 * 
 * @returns 
 */
exports.orderSenderWorker = async (job, done) => {
    let grid = job.data;
    console.log("OrderSenderWorker: sending next order for Grid ", grid);
    let lock = null;
    try {
        // Lock grid
        console.log(`OrderSenderWorker: try to acquire lock in orderSenderWorker for instance ${grid}`);
        lock = await LockService.acquire(['grid-instance-' + grid], 60000);

        console.log(`OrderSenderWorker: lock acquired in orderSenderWorker for instance ${grid}`);
        // Get next order to send
        let instance = await instanceRepository.getInstance(grid);
        if (instance == null) {
            console.log("OrderSenderWorker: instance not found when trying to send order for grid", grid);
            return;
        }

        if (instance.running == false) {
            console.log("OrderSenderWorker: instance not running when trying to send next order", grid);
            return;
        }

        let strategy = instance.strategy;
        let account = strategy.account;

        // create exchange
        const exchange = await exchangeInstanceWithMarketsFromAccount(account);
      
        let gridManager = new GridManager(exchange, instance, strategy)
        let gridInstance = await gridManager.getNextOrderToSend();
        if (gridInstance == null) {
            console.log("OrderSenderWorker: all orders sent for instance ", instance.id);
            return;
        }

        // send order
        let order;
        try {
            console.log(`OrderSenderWorker: Sending order ${strategy.symbol} ${gridInstance.side} ${gridInstance.order_qty} ${gridInstance.price}`);
            order = await exchange.createOrder(
                strategy.symbol,
                'limit',
                gridInstance.side,
                gridInstance.order_qty,
                gridInstance.price, {
                    leverage: 1
                }
            );
        } catch (ex) {
            // TODO: check if error is about insufficient funds for any exchange
            if (ex instanceof ccxt.InsufficientFunds ||
                ex.message.includes('not enough tradable balance')) {
                console.error(`OrderSenderWorker: No funds error sending order for ${grid}. Send NoFunds event`)
                let currency = exchange.currencyNotFoundForMarket(strategy.symbol, gridInstance.side);
                gridNoFundsEventService.send(grid, currency);
            }

            console.log("OrderSenderWorker: error sending order. TODO: check error", ex);
            await eventRepository.create(instance, 'OrderSendError', LEVEL_ERROR, ex.message);
            return;
        }

        console.log(`OrderSenderWorker: creating order in database: ${order.id} ${order.symbol} ${order.side} ${order.status}`);
        // update order id in grid
        await models.sequelize.transaction(async (transaction)=> {
            gridInstance.active = true;
            gridInstance.exchange_order_id = order.id;
            await gridInstance.save({transaction});
        
            await instanceAccRepository.createOrder(
                instance.id,
                strategy.account.id,
                order,
                transaction
            );
        });
        console.log(`OrderSenderWorker: created order in database: ${order.id} ${order.symbol} ${order.side} ${order.status}`);

        
        // send message to next order (maybe we could check if any is pending)
        console.log("OrderSenderWorker: send order sender event, after order sent:", instance.id);
        OrderSenderEventService.send(grid);

    } catch (ex) {
        console.error(`OrderSenderWorker: error processing send order event for instance ${grid}:`, ex);
    } finally {
        console.log(`OrderSenderWorker lock released in orderSenderWorker for instance ${grid}`);
        if (lock != null) try{await lock.unlock();}catch(ex){console.error(ex);}
        done(null, { message: "send order executed" });
    }  
};