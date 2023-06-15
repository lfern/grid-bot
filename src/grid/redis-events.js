const models = require('../../models');
const { PendingAccountRepository } = require('../../repository/PendingAccountRepository');
const { GridManager } = require('./grid');
const { exchangeInstanceWithMarketsFromAccount } = require('../services/ExchangeMarket');
const { exchangeInstance } = require('../crypto/exchanges/exchanges');
const { InstanceRepository } = require('../../repository/InstanceRepository');
const { StrategyInstanceEventRepository, LEVEL_INFO } = require('../../repository/StrategyInstanceEventRepository');
const OrderSenderEventService = require('../services/OrderSenderEventService');
const gridDirtyEventService = require('../services/GridDirtyEventService');
const LockService = require('../services/LockService');
const CheckAccountDepositEventService = require('../services/CheckAccountDepositEventService');
const { BroadcastTransactionRepository } = require('../../repository/BroadcastTransactionRepository');
/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('ccxt').Balance} Balance */

let instanceRepository = new InstanceRepository();
let pendingAccountRepository = new PendingAccountRepository();
let eventRepository = new StrategyInstanceEventRepository();
let transactionRepository = new BroadcastTransactionRepository();

/**
 * 
 * @param {string} accountId 
 * @param {BaseExchangeOrder} dataOrder 
 * @param {boolean} delayed 
 */
exports.orderHandler = async function (accountId, dataOrder, delayed) {
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
        console.error(`OrderHandler: order not found ${dataOrder.id} set delayed=false in ${accountId}`);
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
                    lock = await LockService.acquire(['grid-instance-' + strategyInstance.id], 60000);
                    console.log(`OrderHandler: Lock acquired in orderHandler for order ${dataOrder.id} for instance ${strategyInstance.id}`);
                    if (!strategyInstance.running) {
                        console.log(`OrderHandler: order received while grid is not running ${dataOrder.id}`);
                        await pendingAccountRepository.removeOrder(strategyInstance.strategy.account.id, dataOrder);
                    } else {

                        // TODO: check if there is a pending order in the grid with lower createdAt 
                        let otherPreviousOrder = dataOrder;

                        // create exchange
                        let account = strategyInstance.strategy.account;
                        const exchange = await exchangeInstanceWithMarketsFromAccount(account);
        
                        let gridCreator = new GridManager(exchange, strategyInstance, strategyInstance.strategy);
                        let result = await gridCreator.handleOrder(otherPreviousOrder, delayed);
   
                        if (result.gridDirty) {
                            gridCreator.setGridDirty(true, otherPreviousOrder);
                            // send grid dirty
                            console.log("OrderHandler: send grid dirty event:", strategyInstance.id);
                            gridDirtyEventService.send(strategyInstance.id);
                        } else {
                            if (result.gridUpdated) {
                                console.log("OrderHandler: send order sender event after grid update:", strategyInstance.id);
                                OrderSenderEventService.send(strategyInstance.id);

                                await eventRepository.create(
                                    strategyInstance,
                                    'OrderExecuted',
                                    LEVEL_INFO,
                                    `Order executed: \n`+
                                    `${dataOrder.id} ${dataOrder.side} ${dataOrder.symbol} `+
                                    `${dataOrder.price}/${dataOrder.average} ${dataOrder.amount}/${dataOrder.filled}`
                                );
                            }
                            
                            if (otherPreviousOrder.id != dataOrder.id) {
                                retry = true;
                                console.log(`OrderHandler: grid procesed order id ${otherPreviousOrder.id} instead of ${dataOrder.id}, try to execute with new locking period`);
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

    let isMainAccount = accountType == account.account_type.account_type;
    // get exchange object (don't need to initialize markets)
    // TODO: we need initialize all ccxt stuff only to check if this account receive deposits directly?
    let exchange = exchangeInstance(account.exchange.exchange_name, {
        paper: account.paper === true,
        exchangeType: account.account_type.account_type
    });

    if (isMainAccount) {
        // update wallet balance
        models.Account.update({
            wallet_balance: balance,
            wallet_balance_updated_at: models.Sequelize.fn('NOW'),
        }, {
            where: {id: accountId},
        });

    } else {
        // check if it is a main balance
        if (exchange.mainWalletAccountType() == accountType) {
            // update main wallet balance
            models.Account.update({
                main_balance: balance,
                main_balance_updated_at: models.Sequelize.fn('NOW'),
            }, {
                where: {id: accountId},
            });

            wouldNeedToTransfer = true;
        }

        console.log(
            "BalanceHandler: received a balance for this account that not belong to this accountType: ",
            accountType,
            account.account_type.account_type
        );

    }


    let thisWalletReceiveDeposits = account.account_type.account_type == exchange.mainWalletAccountType(); 
    
    if ((thisWalletReceiveDeposits && isMainAccount ) ||
        (!thisWalletReceiveDeposits && !isMainAccount)) {
        // only send when there are pending transactions
        let transactions = await transactionRepository.getTransactionsWithoutDepositForAccount(accountId);

        if (transactions.length > 0) {
            console.log("BalanceHandler: pending transactions for this account, sending check deposit event", accountId);
            CheckAccountDepositEventService.send(accountId, !thisWalletReceiveDeposits);
        }
    }
 }