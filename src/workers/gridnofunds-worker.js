const { BroadcastTransactionRepository } = require("../../repository/BroadcastTransactionRepository");
const { InstanceRepository } = require("../../repository/InstanceRepository");
const { StrategyInstanceEventRepository, LEVEL_CRITICAL } = require("../../repository/StrategyInstanceEventRepository");
const LockService = require('../services/LockService');

let instanceRepository = new InstanceRepository();
let transactionRepository = new BroadcastTransactionRepository();
let eventRepository = new StrategyInstanceEventRepository()

exports.gridNoFundsWorker = async function(job, done) {
    let grid = job.data;
    console.log("GridNoFundsWorker: checking no funds for grid", grid);
    let lock = null;
    // Lock account    
    let accountId;
    try {
        let instance = await instanceRepository.getInstance(grid, true);
        if (instance == null) {
            return;
        }
        
        accountId = instance.strategy.account.id;
        console.log(`GridNoFundsWorker: try to acquire for ${accountId} (grid: ${grid})`);
        lock = await LockService.acquire(['account-' + accountId], 60000);
        console.log(`GridNoFundsWorker: lock acquired for account ${accountId} (grid: ${grid})`);

        let pendingTransactions = await transactionRepository.getTransactionsNotDeposited4Account(accountId);

        if (!pendingTransactions.length) {
            // send next transaction 
            let transaction = await transactionRepository.nextTransaction4Account(accountId);
            if (transaction == null) {
                console.error(`GridNoFundsWorker: no transactions for this account ${accountId} (grid: ${grid})`);
                await eventRepository.create(
                    instance,
                    'NoTransactions',
                    LEVEL_CRITICAL,
                    `No broadcast transactions for this account ${accountId} when no funds event raised`
                );
            } else {
                // broadcast transaction worker will send the transaction
            }
        }

    } catch (ex) {
        console.error(`NoFundsWorker: error handling no funds event for ${accountId}:`, ex);
    } finally {
        if (lock != null){try {await lock.unlock();} catch(ex){console.error("Error trying to unlock " ,ex);}}
        console.log(`NoFundsWorker lock released for ${accountId} (grid: ${grid})`);
        done(null, { message: "no funds event executed" });
    }
}