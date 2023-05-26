const models = require('../../models');
const { PendingAccountRepository } = require('../../repository/PendingAccountRepository');
const { GridManager } = require('./grid');
const { exchangeInstanceWithMarkets } = require('../services/ExchangeMarket');


/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */

/**
 * 
 * @param {string} accountId 
 * @param {BaseExchangeOrder} dataOrder 
 */
exports.orderHandler = async function (accountId, dataOrder) {
    // Find instance that belongs to this order
    let order = await models.StrategyInstanceOrder.findOne({
        where: {
            account_id: accountId,
            symbol: dataOrder.symbol,
            exchange_order_id: dataOrder.id
        },
    });

    if (order == null) {
        console.error(`Order not found: order ${dataOrder.id}`);
        // Save pending order for this account
        let service = new PendingAccountRepository();
        await service.addOrder(accountId, dataOrder);
    } else {
        // Get strategy intance for order
        const strategyInstance = await models.StrategyInstance.findOne({
            where: {
                id: order.strategy_instance_id,
                running: true,
                stop_requested_at: { [models.Sequelize.Op.is]: null }
            },
            include: [
                {
                    association: models.StrategyInstance.Strategy,
                    include: [
                        {
                            association: models.Strategy.Account,
                            include: [
                                models.Account.Exchange,
                                models.Account.AccountType
                            ]
                        }
                    ]
                }
            ]
        });

        if (strategyInstance == null) {
            console.log(`${orderInstance} instance for account ${accountId} not found or not running`);
        } else {
            // create exchange
            let account = strategyInstance.strategy.account;
            const exchange = await exchangeInstanceWithMarkets(account.exchange.exchange_name, {
                exchangeType: account.account_type.account_type,
                paper: account.paper,
                rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                apiKey: account.api_key,
                secret: account.api_secret,
            });

            let gridCreator = new GridManager(exchange, strategyInstance.id, strategyInstance.strategy)
            await gridCreator.handleOrder(dataOrder);
        }
    }
}