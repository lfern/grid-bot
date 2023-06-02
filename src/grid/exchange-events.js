const {watchMyTrades, watchMyBalance, watchMyOrders} = require('../crypto/exchanges/utils/procutils');

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */
/** @typedef {import('../crypto/exchanges/BaseExchangeTrade').BaseExchangeTrade} BaseExchangeTrade */
/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('ccxt').Balance} Balance */
/** @typedef {import('bull').Queue} Queue */

/**
 * TradeDataEvent type definitions
 * @typedef {Object} TradeDataEvent
 * @property {string} account
 * @property {BaseExchangeTrade} trade
 */

/**
 * OrderDataEvent type definitions
 * @typedef {Object} OrderDataEvent
 * @property {string} account
 * @property {BaseExchangeOrder} order
 */

/**
 * BalanceDataEvent type definitions
 * @typedef {Object} BalanceDataEvent
 * @property {string} account
 * @property {Balance} balance
 * @property {string} accountType
 */

/**
 * 
 * @param {string} account 
 * @param {BaseExchange} exchange 
 * @param {Queue} queue 
 * @returns 
 */
exports.tradeEventHandler = function(account, exchange, queue) {
    return watchMyTrades(exchange, undefined, (trades) => {
        const options = {
            attempts: 0,
            removeOnComplete: true,
            removeOnFail: true,
        };

        // send to redis
        for(let i=0;i<trades.length;i++) {
            let trade = trades[i];
            console.log(trade);
            queue.add({
                account: account,
                trade: trade.toJson()
            }, options).then(ret => {
                console.log("Redis added:", ret);
            }). catch(err => {
                console.error("Error:", err);
            });
        }

    });
};

/**
 * 
 * @param {string} account 
 * @param {BaseExchange} exchange 
 * @param {Queue} queue 
 * @returns 
 */
exports.orderEventHandler = function(account, exchange, queue) {
    return watchMyOrders(exchange, undefined, (orders) => {
        const options = {
            attempts: 0,
            removeOnComplete: true,
            removeOnFail: true,
        };
        
        for(let i=0;i<orders.length;i++) {
            let order = orders[i];
            // send to redis
            console.info(order);
            queue.add({
                account: account,
                order: order.toJson(),
            }, options).then(ret => {
                console.log("Redis added: ", ret);
            }). catch(err => {
                console.error("Error", err);
            });
        }
    });
};

/**
 * 
 * @param {string} account 
 * @param {BaseExchange} exchange 
 * @param {Queue} queue 
 * @returns 
 */
exports.balanceEventHandler = function(account, exchange, queue, accountType = undefined) {
    return watchMyBalance(exchange, (balance, accountType) => {
        const options = {
            attempts: 0,
            removeOnComplete: true,
            removeOnFail: true,
        };

        console.info(balance, accountType);
        // send to redis
        queue.add({
            account: account,
            balance: balance,
            accountType: accountType,
        }, options).then(ret => {
            console.log("Redis added:", ret);
        }). catch(err => {
            console.error("Error:", err);
        });
    }, accountType);
};

