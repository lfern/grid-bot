const {watchMyTrades, watchMyBalance, watchMyOrders} = require('../crypto/exchanges/utils/procutils');

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */
/** @typedef {import('bull').Queue} Queue */

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
        while (trades.length > 0) {
            let trade = trades.shift();
            queue.add({
                account: account,
                trade: trade.toJson()
            }, options).then(ret => {
                console.log(ret);
            }). catch(err => {
                console.error(err);
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
        while (orders.length > 0) {
            let order = orders.shift();
            // send to redis
            queue.add({
                account: account,
                order: order
            }, options).then(ret => {
                console.log(ret);
            }). catch(err => {
                console.error(err);
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
exports.balanceEventHandler = function(account, exchange, queue) {
    return watchMyBalance(exchange, (balance) => {
        const options = {
            attempts: 0,
            removeOnComplete: true,
            removeOnFail: true,
        };

        // send to redis
        queue.add({
            account: account,
            balance: balance
        }, options).then(ret => {
            console.log(ret);
        }). catch(err => {
            console.error(err);
        });
    });
};

