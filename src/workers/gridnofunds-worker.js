const { BroadcastTransactionRepository } = require("../../repository/BroadcastTransactionRepository");
const { InstanceRepository } = require("../../repository/InstanceRepository");
const { StrategyInstanceEventRepository, LEVEL_CRITICAL } = require("../../repository/StrategyInstanceEventRepository");
const LockService = require('../services/LockService');
const {exchangeInstanceFromAccount} = require('../services/ExchangeMarket');
const NotificationEventService = require("../services/NotificationEventService");

/** @typedef {import('../services/GridNoFundsEventService').GridNoFundsMessageData} GridNoFundsMessageData} */

let instanceRepository = new InstanceRepository();
let transactionRepository = new BroadcastTransactionRepository();
let eventRepository = new StrategyInstanceEventRepository();

exports.gridNoFundsWorker = async function(job, done) {
    /** @type {GridNoFundsMessageData} */
    let data = job.data
    let grid = data.grid;
    let currency = data.currency;
    console.log("GridNoFundsWorker: checking no funds for grid", grid, currency);
    
    let lock = null;
    // Lock account    
    let accountId;
    try {
        let instance = await instanceRepository.getInstance(grid, true);
        if (instance == null) {
            return;
        }

        accountId = instance.strategy.account.id;
        const exchange = await exchangeInstanceFromAccount(instance.strategy.account);
        console.log(exchange.mainWalletAccountType());
        if (exchange.mainWalletAccountType() != instance.strategy.account.account_type.account_type && 
            instance.strategy.account.transfer_permission !== true
        ) {
            NotificationEventService.send(
                'NoTransferPermission',
                LEVEL_CRITICAL,
                `Didn't send broadcast transaction for grid ${grid} because account ${accountId} doesn't have transfer permission`,
                {account: accountId}
            )
            return;
        }
        
        console.log(`GridNoFundsWorker: try to acquire for ${accountId} (grid: ${grid})`);
        lock = await LockService.acquire(['account-' + accountId], 60000);
        console.log(`GridNoFundsWorker: lock acquired for account ${accountId} (grid: ${grid})`);

        let pendingTransactions = await transactionRepository.getTransactionsNotDeposited4Account(accountId);

        if (pendingTransactions.length == 0) {
            // send next transaction 
            let transaction = await transactionRepository.nextTransaction4Account(accountId, currency);
            if (transaction == null) {
                console.error(`GridNoFundsWorker: no transactions for this account ${accountId} currency ${currency} (grid: ${grid})`);
                await eventRepository.create(
                    instance,
                    'NoTransactions',
                    LEVEL_CRITICAL,
                    `No broadcast transactions for this account ${accountId} when no funds event raised`
                );
            } else {
                // broadcast transaction worker will send the transaction
            }
        } else {

        }

        instanceRepository.noFunds(grid, currency);
    } catch (ex) {
        console.error(`GridNoFundsWorker: error handling no funds event for ${accountId}:`, ex);
    } finally {
        if (lock != null){try {await lock.unlock();} catch(ex){console.error("Error trying to unlock " ,ex);}}
        console.log(`GridNoFundsWorker lock released for ${accountId} (grid: ${grid})`);
        done(null, { message: "no funds event executed" });
    }
}