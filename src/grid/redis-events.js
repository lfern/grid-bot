const models = require('../../models');
const { PendingAccountRepository } = require('../../repository/PendingAccountRepository');
const { GridManager } = require('./grid');
const { exchangeInstanceWithMarkets } = require('../services/ExchangeMarket');
const { exchangeInstance } = require('../crypto/exchanges/exchanges');
const Redlock= require("redlock");
const { InstanceRepository } = require('../../repository/InstanceRepository');
const { InstanceAccountRepository } = require('../../repository/InstanceAccountingRepository');

/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('ccxt').Balance} Balance */

let instanceRepository = new InstanceRepository();
let instanceAccRepository = new InstanceAccountRepository();
let pendingAccountRepository = new PendingAccountRepository();

/**
 * 
 * @param {Redlock} redlock 
 * @param {string} accountId 
 * @param {BaseExchangeOrder} dataOrder 
 */
exports.orderHandler = async function (redlock, myOrderSenderQueue, accountId, dataOrder, delayed) {
    if (delayed === undefined) {
        console.log(`OrderHandler: Add order to pending (first time seen here) ${accountId} ${dataOrder.id} ${dataOrder.symbol} ${dataOrder.status}`);
        await pendingAccountRepository.addOrder(accountId, dataOrder);
    }

    // Find instance that belongs to this order
    let order = await models.StrategyInstanceOrder.findOne({
        where: {
            account_id: accountId,
            symbol: dataOrder.symbol,
            exchange_order_id: dataOrder.id
        },
    });

    if (order == null) {
        console.error(`OrderHandler: order not found ${dataOrder.id} set delayed=false`);
        // Save pending order for this account
        await pendingAccountRepository.setDelayed(accountId, dataOrder, false);
    } else {
        // Get strategy intance for order
        const strategyInstance = await instanceRepository.getInstance(order.strategy_instance_id);

        if (strategyInstance == null) {
            console.log(`OrderHandler: ${strategyInstance} instance for account ${accountId} not found, remove order ${dataOrder.id} from pending data`);
            await pendingAccountRepository.removeOrder(strategyInstance.strategy.account.id, dataOrder);
        } else {
            // Save before process just to be sure we don't loose it
            await pendingAccountRepository.setDelayed(strategyInstance.strategy.account.id, dataOrder, true);

            let retry = true;
            while(retry) {
                retry = false;
                console.log(`OrderHandler: try to acquire lock in orderHandler for order ${dataOrder.id} for instance ${strategyInstance.id}`);
                let lock = null;
                try {
                    try {
                        lock = await redlock.acquire(['grid-instance-' + strategyInstance.id], 15000);
                    } catch (ex) {
                        console.error(`OrderHandler: error waiting for lock in orderHandler for order ${dataOrder.id} for instance ${strategyInstance.id} try to repeat`, ex)
                        // TODO: what to do with this order: save for latter?
                    }   

                    console.log(`OrderHandler: Lock acquired in orderHandler for order ${dataOrder.id} for instance ${strategyInstance.id}`);
                    if (!strategyInstance.running) {
                        console.log(`OrderHandler: order received while grid is not running ${dataOrder.id}`);
                        await pendingAccountRepository.removeOrder(strategyInstance.strategy.account.id, dataOrder);
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
        
                        let gridCreator = new GridManager(exchange, strategyInstance.id, strategyInstance.strategy);
                        let orderHandled = await gridCreator.handleOrder(dataOrder, delayed);
    
                        if (orderHandled != null) {
                            const options = {
                                attempts: 0,
                                removeOnComplete: true,
                                removeOnFail: true,
                            };
        
                            console.log("OrderHandler: send grid update:", strategyInstance.id);
                            myOrderSenderQueue.add(strategyInstance.id, options).then(ret => {
                                console.log("OrderHandler: redis added grid update:", strategyInstance.id);
                            }). catch(err => {
                                console.error("OrderHandler:", err);
                            });
                            
                            if (orderHandled.id != dataOrder.id) {
                                retry = true;
                                console.log(`OrderHandler: grid procesed order id ${handleOrder.id} instead of ${dataOrder.id}, try to execute with new locking period`);
                            }
                        }
                    }
                    
                } catch (ex) {
                    console.error(`OrderHandler: error handling orderHandler for order ${dataOrder.id} for instance ${strategyInstance.id} try to repeat`, ex)
                } finally {
                    console.log(`OrderHandler: lock released in orderHandler for order ${dataOrder.id} for instance ${strategyInstance.id}`);
                    if (lock != null) try{await lock.unlock();}catch(ex){console.error(ex);}
                }
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
        console.log("BalanceHandler: Account does not exist when receiving a balance event: ", accountId);
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
            "BalanceHandler: received a balance for this account that not belong to this accountType: ",
            accountType,
            account.account_type.account_type
        );
    }

 }