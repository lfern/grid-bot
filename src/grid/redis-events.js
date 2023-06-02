const models = require('../../models');
const { PendingAccountRepository } = require('../../repository/PendingAccountRepository');
const { GridManager } = require('./grid');
const { exchangeInstanceWithMarkets } = require('../services/ExchangeMarket');
const { exchangeInstance } = require('../crypto/exchanges/exchanges');


/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('ccxt').Balance} Balance */

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
                // running: true,
                // stop_requested_at: { [models.Sequelize.Op.is]: null }
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
            console.log(`${strategyInstance} instance for account ${accountId} not found`);
        } else {

            if (!strategyInstance.running || strategyInstance.stop_requested_at != null) {
                console.log(`Order received while grid is not running ${dataOrder.id}`);
                let instanceAccRepository = new InstanceAccountRepository();
                await instanceAccRepository.updateOrder(strategyInstance.account.id, dataOrder);
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
}

/**
 * 
 * @param {string} accountId 
 * @param {Balance} balance 
 * @param {string} accountType
 */
 exports.balanceHandler = async function (accountId, balance, accountType) {
    let account = await models.Account.findOne({
        where: {id: accountId},
        include: [models.Account.AccountType, models.Account.Exchange]
    });
    if (account == null) {
        console.log("Account does not exist when receiving a balance event: ", accountId);
        return;
    }

    // TODO: if pending orders to be sent send signal to send them
    if (accountType == account.account_type.account_type) {
        // update wallet balance
        models.Account.update({
            wallet_balance: balance,
            wallet_balance_updated_at: models.Sequelize.fn('NOW'),
        }, {
            where: {id: accountId},
        })
    } else {
        // check if it is a main balance
        // get exchange object (don't need to initialize markets)
        let exchange = exchangeInstance(account.exchange.exchange_name, {
            paper: account.paper === true,
            exchangeType: account.account_type.account_type
        });

        if (exchange.mainWalletAccountType() == accountType) {
            // update main wallet balance
            models.Account.update({
                main_balance: balance,
                main_balance_updated_at: models.Sequelize.fn('NOW'),
            }, {
                where: {id: accountId},
            })    
        }

        console.log(
            "Received a balance for this account that not belong to this accountType: ",
            accountType,
            account.account_type.account_type
        );
    }

 }