
/** @typedef {import('bull').Queue} Queue} */
const Redlock = require("redlock");
const { InstanceRepository } = require('../../repository/InstanceRepository');
const { GridManager } = require('../grid/grid');
const {exchangeInstanceWithMarkets} = require('../services/ExchangeMarket');
const models = require('../../models');
const { InstanceAccountRepository } = require('../../repository/InstanceAccountingRepository');


let instanceRepository = new InstanceRepository();
let instanceAccRepository = new InstanceAccountRepository();

/**
 * 
 * @param {Queue} myOrderSenderQueue 
 * @param {Redlock} redlock
 * @returns 
 */
exports.orderSenderWorker = function (myOrderSenderQueue, redlock) {
    return async (job, done) => {
        let grid = job.data;
        console.log("OrderSenderWorker: sending next order for Grid ", grid);
        let lock = null;
        try {
            // Lock grid
            console.log(`OrderSenderWorker: try to acquire lock in orderSenderWorker for instance ${grid}`);
            lock = await redlock.acquire(['grid-instance-' + grid], 15000);

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
            const exchange = await exchangeInstanceWithMarkets(account.exchange.exchange_name, {
                exchangeType: account.account_type.account_type,
                paper: account.paper,
                rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                apiKey: account.api_key,
                secret: account.api_secret,
            });


            let gridManager = new GridManager(exchange, instance.id, strategy)
            let gridInstance = await gridManager.getNextOrderToSend();
            if (gridInstance == null) {
                console.log("OrderSenderWorker: all orders sent for instance ", instance.id);
                return;
            }
                    
            // send order
            let order;
            try {
                order = await exchange.createOrder(
                    strategy.symbol,
                    'limit',
                    gridInstance.side,
                    gridInstance.order_qty,
                    gridInstance.price
                );
            } catch (ex) {
                console.log("OrderSenderWorker: error sending order. TODO: check error", ex);
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
            const options = {
                attempts: 0,
                removeOnComplete: true,
                removeOnFail: true,
            };
            
            console.log("OrderSenderWorker: send order sender event, after order sent:", instance.id);
            myOrderSenderQueue.add(grid, options).then(ret => {
                console.log("OrderSenderWorker: redis added order sender event, after order sent:", instance.id);
            }). catch(err => {
                console.error("Error:", err);
            });

        } catch (ex) {
            console.error(`OrderSenderWorker: error processing send order event for instance ${grid}:`, ex);
            return;
        } finally {
            console.log(`OrderSenderWorker lock released in orderSenderWorker for instance ${grid}`);
            if (lock != null) try{await lock.unlock();}catch(ex){console.error(ex);}
            done(null, { message: "send order executed" });
        }

        
    
        
    };
}