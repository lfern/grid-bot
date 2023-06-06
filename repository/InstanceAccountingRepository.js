const { PendingAccountRepository } = require("./PendingAccountRepository");
const models = require('../models');

/** @typedef {import('../src/crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('../src/crypto/exchanges/BaseExchangeTrade').BaseExchangeTrade} BaseExchangeTrade */

class InstanceAccountRepository {

    /**
     * 
     * @param {int} instanceId 
     * @param {string} accountId 
     * @param {BaseExchangeOrder} order 
     * @param {*} transaction 
     */
    async createOrder(instanceId, accountId, order, transaction = null) {
        // check account is still present
        let instance = await models.StrategyInstance.findOne({where:{id: instanceId}, transaction});

        if (instance == null) {
            console.log(`Instance is not present in db ${instance} trying to add order ${order.id}`);
            return;
        }
        
        await models.StrategyInstanceOrder.create({
            strategy_instance_id: instanceId,
            account_id: accountId,
            exchange_order_id: order.id,
            symbol: order.symbol,
            order_type: order.type,
            side: order.side,
            timestamp: order.timestamp,
            datetime: order.datetime,
            creation_timestamp: order.timestamp,
            creation_datetime: order.datetime,
            status: order.status,
            price: order.price,
            amount: order.amount,
            cost: order.cost,
            average: order.average,
            filled: order.filled,
            remaining: order.remaining,
        }, transaction != null ?{transaction}:{})
    }
    
    async getOrder(accountId, order) {
        await models.StrategyInstanceOrder.findOne({
            where: {
                account_id: accountId,
                symbol: order.symbol,
                exchange_order_id: order.id
            },
        });
    }
    
    /**
     * 
     * @param {string} accountId 
     * @param {BaseExchangeOrder} order 
     */
    async updateOrder(accountId, order) {
        await models.sequelize.transaction(async transaction => {
            let dbOrder = await models.StrategyInstanceOrder.findOne({
                where: {
                    account_id: accountId,
                    symbol: order.symbol,
                    exchange_order_id: order.id
                },
                lock: transaction.LOCK.UPDATE,
                transaction
            });
            
            if (dbOrder == null) {
                console.error(`Order not found updating order ????: order ${order.id}`);
                let pendingAccountRepository = new PendingAccountRepository();
                await pendingAccountRepository.addOrder(accountId, order);
            } else {
                // already exists, update if necesary
                if (dbOrder.status == 'open') {
                    dbOrder.timestamp = order.timestamp;
                    dbOrder.datetime = order.datetime;
                    dbOrder.status = order.status;
                    dbOrder.price = order.price;
                    dbOrder.amount = order.amount;
                    dbOrder.cost = order.cost;
                    dbOrder.average = order.average;
                    dbOrder.filled = order.filled;
                    dbOrder.remaining = order.remaining;
                    await dbOrder.save({transaction});
                }
            }
        });
    }

    /**
     * 
     * @param {string} accountId 
     * @param {BaseExchangeTrade} trade 
     */
    async createTrade(accountId, trade) {
        await models.sequelize.transaction(async transaction => {
            let dbOrder = await models.StrategyInstanceOrder.findOne({
                where: {
                    account_id: accountId,
                    symbol: trade.symbol,
                    exchange_order_id: trade.order
                },
                lock: transaction.LOCK.UPDATE,
                transaction
            });
            
            if (dbOrder == null) {
                let pendingAccountRepository = new PendingAccountRepository();
                await pendingAccountRepository.addTrade(accountId, trade, transaction);
            } else {
                // order exists so create trade
                await models.StrategyInstanceTrade.findOrCreate({
                    where: {
                        strategy_instance_order_id: dbOrder.id,
                        symbol: trade.symbol,
                        exchange_trade_id: trade.id,    
                    },
                    defaults: {
                        strategy_instance_order_id: dbOrder.id,
                        account_id: dbOrder.account_id,
                        symbol: dbOrder.symbol,
                        exchange_trade_id: trade.id,
                        timestamp: trade.timestamp,
                        datetime: trade.datetime,
                        price: trade.price,
                        amount: trade.amount,
                        cost: trade.cost,
                        fee_cost: trade.feeCost ? trade.feeCost : null,
                        fee_coin: trade.feeCurrency ? trade.feeCurrency : null,
                    },
                    transaction
                });
            }
        });
    }
}

module.exports = {InstanceAccountRepository}