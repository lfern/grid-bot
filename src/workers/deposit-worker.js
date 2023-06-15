const { BroadcastTransactionRepository } = require("../../repository/BroadcastTransactionRepository");
const LockService = require("../services/LockService");
const {AccountRepository} = require('../../repository/AccountRepository');
const { exchangeInstanceWithMarketsFromAccount } = require("../services/ExchangeMarket");
const { BaseExchange } = require("../crypto/exchanges/BaseExchange");
const models = require('../../models');
const { InstanceRepository } = require("../../repository/InstanceRepository");
const orderSenderEventService = require("../services/OrderSenderEventService");
const { default: ccxt } = require("ccxt");
const notificationEventService = require("../services/NotificationEventService");
const { LEVEL_CRITICAL, LEVEL_INFO } = require("../../repository/StrategyInstanceEventRepository");

let transactionRepository = new BroadcastTransactionRepository();
let accountRepository = new AccountRepository();
let instanceRepository = new InstanceRepository();

/** @typedef {import('../services/CheckAccountDepositEventService').CheckAccountDepositEventData} CheckAccountDepositEventData */

exports.checkDepositWorker = async function(job, done) {
    /** @type {CheckAccountDepositEventData} */
    let data = job.data;
    let accountId = data.account;
    let transferFromMainWallet = data.transferFromMainWallet;

    console.log("CheckDepositHandler: checking deposits for account", accountId);
    let lock = null;
    // Lock account
    try {
        console.log(`CheckDepositHandler: try to acquire for account ${accountId}`);
        lock = await LockService.acquire(['account-' + accountId], 60000);
        console.log(`CheckDepositHandler: lock acquired for account ${accountId}`);

        let transactions = await transactionRepository.getTransactionsWithoutDepositForAccount(accountId);

        if (transactions.length == 0) {
            console.log(`CheckDepositHandler: no transactions pending to be deposited for ${accountId}`);
            return;
        }

        let account = await accountRepository.getInstance(accountId);
        let exchange = await exchangeInstanceWithMarketsFromAccount(account);

        let date = Date.now();
        transactions.forEach(t => {
            if (t.sent_at < date) {
                date = t.sent_at;
            }
        })

        let deposits = await getDeposits(exchange, date.getTime());

        let processedTransactions = [];
        let depositedAmounts = {};
        let almostOneDeposited = matchDeposits(
            accountId,
            deposits,
            transactions,
            processedTransactions,
            depositedAmounts,
        )

        if (almostOneDeposited) {
            console.log(transferFromMainWallet)
            if (transferFromMainWallet) {
                console.log(`CheckDepositHandler: not main balance, so try to transfer for  ${accountId}`);
                // fetch balance
                let balance = await exchange.fetchBalanceDepositWallet();

                // transfer money
                let currencies = Object.keys(depositedAmounts);
                let fromWallet = exchange.mainWalletAccountType();
                let toWallet = account.account_type.account_type;

                for(let i=0;i<currencies.length;i++) {
                    let currency = currencies[i];
                    let amount = depositedAmounts[currency];
                    if (balance.free[currency] < amount) {
                        amount = balance.free[currency];
                        console.log(`CheckDepositHandler: Not enough balance for  ${currency} ${amount}`);
                    }

                    console.log(`CheckDepositHandler: transfer ${currency} ${amount} from ${fromWallet} to ${toWallet} for ${accountId}`);
                    try {
                        await exchange.transfer(currency, amount, fromWallet, toWallet);
                    } catch (ex) {
                        if (ex instanceof ccxt.PermissionDenied) {
                            // Set transfer permissions to false an exit
                            notificationEventService.send(
                                'TransferError',
                                LEVEL_CRITICAL,
                                `Error trying to transfer funds ${currency} ${amount} from ${fromWallet} to ${toWallet} for account ${accountId}: ${ex.message}`,
                                {account: accountId}
                            ); 
                            console.error(`CheckDeposithandler: no permissions error when trying to transfer${currency} ${amount} from ${fromWallet} to ${toWallet} for ${accountId}`);
                            await accountRepository.setTransferPermission(accountId, false);
                            break;
                        } else {
                            // try later
                            notificationEventService.send(
                                'TransferError',
                                LEVEL_CRITICAL,
                                `Error trying to transfer funds ${currency} ${amount} from ${fromWallet} to ${toWallet} for account ${accountId}: ${ex.message}`,
                                {account: accountId}
                            );
                            eventRepository.create()
                            throw ex;
                        }
                    }
                }
            }

            notificationEventService.send(
                'DepositMatched',
                LEVEL_INFO,
                `Deposit matched for last transaction sent. Trying to send pending orders for account ${accountId}`,
            );

            // flag all running instances to nofunds = false
            let gridIds = await instanceRepository.resetNoFundsRunningGrids4Account(accountId);
            console.log(gridIds)
            // send order event
            gridIds.forEach(grid => {
                console.log(`CheckDepositHandler: sending order sender event to grid ${grid}`)
                orderSenderEventService.send(grid);
            });

            await models.sequelize.transaction(async (transaction) => {
                for (let i=0;i<processedTransactions.length;i++) {
                    let t = processedTransactions[i];
                    if (t.changed()) {
                        await t.save({transaction});
                    }
                }
            });

        }

    } catch (ex) {
        console.error(`CheckDepositHandler: error checking deposits for ${accountId}:`, ex);
    } finally {
        if (lock != null){try {await lock.unlock();} catch(ex){console.error("Error trying to unlock " ,ex);}}
        console.log(`CheckDepositHandler lock released for account ${accountId}`);
        done(null, { message: "check deposit event executed" });
    }
}

/**
 * 
 * @param {BaseExchange} exchange 
 */
const getDeposits = async function(exchange, since) {
    // return [fakeDeposit];
    
    if (exchange.has('fetchDeposits')) {
        return await exchange.fetchDeposits(undefined, since);
    } else {
        let transactions = await exchange.fetchTransactions(undefined, since);
        return transactions.filter(t => t.type == 'deposit');
    }
}


const matchDeposits = function(
    accountId, 
    deposits,
    transactions,
    processedTransactions,
    depositedAmounts,
) {
    // order deposits and transactions desc
    deposits.sort((a, b) => a.timestamp > b.timestamp ? -1 : (a.timestamp < b.timestamp ? 1 : 0));
    transactions.sort((a, b) => a.sent_at > b.sent_at ? -1 : (a.sent_at < b.sent_at ? 1 : 0));

    console.log(
        `CheckDepositHandler: Matching deposits for account ${accountId}`,
        deposits.map(x => "Deposit:" + x.id + " " + new Date(x.timestamp).toISOString() + " " + x.currency + " " + x.amount),
        transactions.map(x => "Transaction:" + x.id + " " + x.sent_at.toISOString() +" " + x.sent_at.getTime())
    );

    // try to match deposits with transactions
    let deposit = deposits.shift();
    let transaction = transactions.shift();
    let almostOneDeposited = false;
    while (transaction) {
        if (deposit) {
            if (deposit.timestamp > transaction.sent_at.getTime()) {
                transaction.deposit_id = deposit.id;
                transaction.deposited_at = new Date(deposit.timestamp);
                transaction.deposit = deposit;
                transaction.deposit_status = 'deposited';
                almostOneDeposited = true;
                if (! (deposit.currency in depositedAmounts)) {
                    depositedAmounts[deposit.currency] = 0;
                }
                depositedAmounts[deposit.currency] = depositedAmounts[deposit.currency] + deposit.amount;

                processedTransactions.push(transaction);
                // next
                transaction = transactions.shift();
                deposit = deposits.shift();
            } else {
                // not to process this transaction if not deposited yet
                if (almostOneDeposited) {
                    transaction.deposit_status = 'missing';
                }

                transaction = transactions.shift();
            }
        } else {
            if (almostOneDeposited) {
                transaction.deposit_status = 'missing';
                transaction = transactions.shift();
            }
            processedTransactions.push(transaction);
        }
    }

    console.log(
        `CheckDepositHandler: Procesed transactions and Currencies for account ${accountId}`,
        processedTransactions.map(x => "Transaction:" + x.id + " " + x.sent_at.toISOString()),
        Object.entries(depositedAmounts).map(x => "Coin:" + x[0] + " " + x[1])
    );

    return almostOneDeposited;
}

let fakeDeposit0 = {
    info: [
        20357540,
        'UST',
        'TETHERUSDTPLY',
        null,
        null,
        1682691678000,
        1682691678000,
        null,
        null,
        'COMPLETED',
        null,
        null,
        10,
        0,
        null,
        null,
        '0x9beB3D1B096B8cBF2BC5F851a4aEF6a9b0fc7eE1',
        null,
        null,
        null,
        '0xce470e536857888cd63ce41b8c7b36496745f1965b647b1c0b1bef498d436683',
        null
    ],
    id: '20357540',
    txid: '0xce470e536857888cd63ce41b8c7b36496745f1965b647b1c0b1bef498d436683',
    type: 'deposit',
    currency: 'TESTUSDT', //'USDT',
    network: 'TETHERUSDTPLY',
    amount: 50000,
    status: 'ok',
    timestamp: 1686323192379, //1682691678000,
    datetime: '2023-04-28T14:21:18.000Z',
    address: '0x9beB3D1B096B8cBF2BC5F851a4aEF6a9b0fc7eE1',
    addressFrom: undefined,
    addressTo: '0x9beB3D1B096B8cBF2BC5F851a4aEF6a9b0fc7eE1',
    tag: undefined,
    tagFrom: undefined,
    tagTo: undefined,
    updated: 1682691678000,
    comment: undefined,
    fee: { currency: 'USDT', cost: 0, rate: undefined }
};

