let { ErrorDelay } = require('./timeutils');
let ccxt = require('ccxt');
let {BaseExchangeTrade} = require('../BaseExchangeTrade');

/**
 * 
 * @param {(any, any, Promise<void>) => Promise<any>} asyncfn 
 * @returns 
 */
function cancelablePromise(asyncfn) {
    const ret = {};
    const signal = new Promise((resolve, reject) => {
        ret.cancel = () => reject(new Error("Promise was cancelled"));
    });

    ret.promise = new Promise(async (resolve, reject) => {
        try {
            await asyncfn(resolve, reject, signal);
        } catch (ex) {
            reject(ex);
        }
    });

    return ret
}

/**
 * Trade callback
 *
 * @callback TradeCallback
 * @param {[BaseExchangeTrade]} tradeList
 */

/**
 * Watch trades to observe current price
 * 
 * @param {ccxt.exchange} exchange exchange ccxt class
 * @param {string} symbol market symbol where place orders
 * @param {TradeCallback} cb trade callback
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
function watchTrades(exchange, symbol, cb) {
    return cancelablePromise(async (resolve, reject, signal) => {
        signal.catch(err => {
            // Exit when canceled externally
            reject(err);
        });

        let delayer = new ErrorDelay();
        while(true) {
            delayer.restoring();
            try {
                while (true) {
                    // Wait for public trades
                    let trades = await exchange.watchTrades(symbol);
                    cb(trades);
                }
            } catch (ex) {
                // "connection closed by remote server, closing code 1006"
                // "getaddrinfo ENOTFOUND api-pub.bitfinex.com"
                console.error(ex);
                if (ex instanceof ccxt.NetworkError) {
                    await delayer.errorAndWait();
                } else {
                // Exit if there is any error in the websocket connection
                    throw ex;
                }
            }
        }
    });
}

/**
 * Watch my executed trades from websocket events
 * 
 * @param {ccxt.exchange} exchange exchange ccxt class
 * @param {string} symbol market symbol where place orders
 * @param {TradeCallback} cb trade callback
 * @param {int} amount amount to buy when creating and order
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
function watchMyTrades(exchange, symbol, cb) {
    return cancelablePromise(async (resolve, reject, signal) => {
        signal.catch(err => {
            // Exit when canceled externally
            reject(err);
        });

        let delayer = new ErrorDelay();
        while(true) {
            delayer.restoring();

            try {
                while (true) {
                    // Wait for new trades
                    let trades = await exchange.watchMyTrades(symbol);
                    // for each trade
                    cb(trades);
                }
            } catch (ex) {
                // "connection closed by remote server, closing code 1006"
                // "getaddrinfo ENOTFOUND api-pub.bitfinex.com"
                console.error(ex);
                if (ex instanceof ccxt.NetworkError) {
                    await delayer.errorAndWait();
                } else {
                // Exit if there is any error in the websocket connection
                    throw ex;
                }
            }
        }
    });
}

/**
 * Check my pending trades using REST API
 * (this method is not used by now. Maybe we should implement an alternative method
 * when websockets is not working right)
 * 
 * @param {ccxt.exchange} exchange exchange ccxt class
 * @param {string} symbol market symbol where place orders
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
function checkMyTradesInterval(exchange) {
    return cancelablePromise((resolve, reject, signal) => {
        const interval = setInterval(() => {
            // TODO: Invoke API method to get last closed orders
            console.log("I was called");
            res("ok");
        }, ms);

        signal.catch(err => {
            rej(err);
            clearInterval(interval);
        });

    });
}


module.exports = {
    cancelablePromise, 
    watchTrades,
    watchMyTrades,
    checkMyTradesInterval,
}