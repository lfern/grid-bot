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
    async createOrder(instanceId, accountId, order, matching_order_id = null, transaction = null) {
        // check account is still present
        let instance = await models.StrategyInstance.findOne({where:{id: instanceId}, transaction});

        if (instance == null) {
            console.log(`Instance is not present in db ${instance} trying to add order ${order.id}`);
            return;
        }
        
        return await models.StrategyInstanceOrder.create({
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
            matching_order_id: matching_order_id
        }, transaction != null ?{transaction}:{})
    }
    
    async getOrder(accountId, order) {
        return await this.getOrderSymbol(
                accountId,
                order.symbol,
                order.id
        );
    }

    async getOrderSymbol(accountId, symbol, exchange_order_id) {
        return await models.StrategyInstanceOrder.findOne({
            where: {
                account_id: accountId,
                symbol: symbol,
                exchange_order_id: exchange_order_id
            },
        });
    }

    async getOrderById(id) {
        return await models.StrategyInstanceOrder.findOne({
            where: {
                id: id,
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
                const [dbTrade, created] = await models.StrategyInstanceTrade.findOrCreate({
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
                        taker_or_maker: trade.takerOrMaker,
                        side: trade.side,
                        exchange_order_id: trade.order,
                    },
                    transaction
                });

                if (created) {
                    await models.StrategyInstanceOrder.increment('trades_filled',{
                        by: trade.amount,
                        where: {
                            id: dbOrder.id,
                        },
                        transaction
                    });

                    await models.StrategyInstanceOrder.update({
                        'trades_ok': true
                    },{
                        where: {
                            id: dbOrder.id,
                            [models.Sequelize.Op.or] : [{
                                amount: {
                                    [models.Sequelize.Op.eq]: models.sequelize.col('trades_filled')
                                }
                            }, {
                                status: {[models.Sequelize.Op.notIn]: ['open', 'closed']},
                                filled: {
                                    [models.Sequelize.Op.eq]: models.sequelize.col('trades_filled')
                                }
                            }]
                        },
                        transaction
                    });

                    await models.StrategyInstanceGrid.increment('filled', {
                        by: trade.amount,
                        where: {
                            strategy_instance_id: dbOrder.strategy_instance_id,
                            order_id: dbOrder.id,
                        },
                        transaction
                    })
                }
            }
        });
    }

    async getNextOrderNotFilled(instanceId) {
        return await models.StrategyInstanceOrder.findOne({
            where: {
                strategy_instance_id: instanceId,
                trades_ok: false
            }
        });
    }

}

module.exports = {InstanceAccountRepository}