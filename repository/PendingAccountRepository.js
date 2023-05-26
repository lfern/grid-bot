const models = require('../models');
const { BaseExchangeCcxtOrder } = require('../src/crypto/exchanges/ccxt/BaseExchangeCcxtOrder');

/** @typedef {import('../src/crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('../src/crypto/exchanges/BaseExchangeTrade').BaseExchangeTrade} BaseExchangeTrade */

class PendingAccountRepository {
    /**
     * Add order to account pending orders
     * 
     * @param {string}
     * @param {BaseExchangeOrder} order 
     */
    async addOrder(accountId, order, delayed = false) {
        await models.sequelize.transaction(async (transaction) => {
            // check account is still present
            let account = await models.Account.findOne({where:{id: accountId}, transaction});

            if (account == null) {
                console.log(`Account is not present in db ${accountId} trying to add order ${order.id}`);
                return;
            }

            const [dbOrder, created] = await models.AccountPendingOrder.findOrCreate({
                where: {
                    account_id: accountId,
                    symbol: order.symbol,
                    order_id: order.id    
                },
                defaults: {
                    account_id: accountId,
                    order: order.toJson(),
                    timestamp: models.Sequelize.fn('NOW'),
                    order_id: order.id,
                    symbol: order.symbol,
                    delayed: delayed,
                },
                lock: transaction.LOCK.UPDATE, 
                transaction
            });
    
            if (!created) {
                let orderStatusesPreceding = {
                    'open' : [],
                    'canceled': ['open'],
                    'rejected': ['open'],
                    'expired': ['open'],
                    'closed': ['open', ],
                };
                let dbOrderJson = BaseExchangeCcxtOrder.fromJson(dbOrder.order);
                if (dbOrderJson.status == 'open') {
                    dbOrder.order = order.toJson();
                    dbOrder.delayed = delayed,
                    dbOrder.timestamp = order.timestamp,//models.Sequelize.fn('NOW');
                    await dbOrder.save({transaction});
                }
            }
        });
        
    }

    /**
     * Add trade to account pending trades
     * 
     * @param {string}
     * @param {BaseExchangeTrade} trade
     */
    async addTrade(accountId, trade, transaction = null ) {

        // check account is still present
        let account = await models.Account.findOne({where:{id: accountId}, transaction});
        if (account == null) {
            console.log(`Account is not present in db ${accountId} trying to add trade ${trade.id}`);
            return;
        }

        let options = {
            where: {
                account_id: accountId,
                symbol: trade.symbol,
                order_id: trade.order    
            },
            defaults: {
                account_id: accountId,
                trade: trade.toJson(),
                timestamp: trade.timestamp,//models.Sequelize.fn('NOW'),
                trade_id: trade.id,
                order_id: trade.order,
                symbol: trade.symbol,
            },
        };

        if (transaction != null) {
            options.transaction = transaction;
        }

        await models.AccountPendingTrade.findOrCreate(options);
    }

    async getOldestOrders(limit = 10, forUpdate = false, transaction = null) {
        const options = {
            transaction,
            order: [
                ['updated_at', 'ASC'],
            ],
            limit: limit
        };

        if (forUpdate) {
            options.lock = transaction.LOCK.UPDATE;
        }

        return await models.AccountPendingOrder.findAll({
            options,
        });
    }
}

module.exports = {
    PendingAccountRepository
}