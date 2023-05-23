let { ErrorDelay } = require('./timeutils');
let { BaseExchange } = require('../BaseExchange');
let ccxt = require('ccxt');
let {BaseExchangeTrade} = require('../BaseExchangeTrade');
let {BaseExchangeOrder} = require('../BaseExchangeOrder');

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
 * Order callback
 *
 * @callback OrderCallback
 * @param {[BaseExchangeOrder]} orderListList
 */

/**
 * Balance callback
 *
 * @callback BalanceCallback
 * @param {ccxt.Balance} balance
 */

/**
 * Watch trades to observe current price
 * 
 * @param {BaseExchange} exchange exchange class
 * @param {string} symbol market symbol where place orders
 * @param {TradeCallback} cb trade callback
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
function watchTrades(exchange, symbol, cb) {
    return cancelablePromise(async (resolve, reject, signal) => {
        let cancelled = false;
        signal.catch(err => {
            // Exit when canceled externally
            cancelled = true;
            //reject(err);
        });

        let delayer = new ErrorDelay();
        while(!cancelled) {
            delayer.restoring();
            try {
                while (!cancelled) {
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
                    console.log("Exit listening trades")
                    throw ex;
                }
            }
        }
        console.log("Exit listening trades")
        resolve();
    });
}

/**
 * Watch my executed trades from websocket events
 * 
 * @param {BaseExchange} exchange exchange class
 * @param {string} symbol market symbol where place orders
 * @param {TradeCallback} cb trade callback
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
function watchMyTrades(exchange, symbol, cb) {
    return cancelablePromise(async (resolve, reject, signal) => {
        let cancelled = false;
        signal.catch(err => {
            // Exit when canceled externally
            cancelled = true;
            // reject(err);
        });

        let delayer = new ErrorDelay();
        while(!cancelled) {
            delayer.restoring();

            try {
                while (!cancelled) {
                    // Wait for new trades
                    let trades = await exchange.watchMyTrades(symbol);
                    // fOrderor each trade
                    cb(trades);
                }
            } catch (ex) {
                // "connection closed by remote server, closing code 1006"
                // "getaddrinfo ENOTFOUND api-pub.bitfinex.com"
                console.error(ex);
                if (ex instanceof ccxt.NetworkError) {
                    await delayer.errorAndWait();
                } else {
                    console.log("Exit listening trades")
                    // Exit if there is any error in the websocket connection
                    throw ex;
                }
            }
        }
        console.log("Exit listening trades")
        resolve();
    });
}

/**
 * Watch my orders from websocket events
 * 
 * @param {BaseExchange} exchange exchange class
 * @param {string} symbol market symbol where place orders
 * @param {OrderCallback} cb trade callback
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
 function watchMyOrders(exchange, symbol, cb) {
    return cancelablePromise(async (resolve, reject, signal) => {
        let cancelled = false;
        signal.catch(err => {
            // Exit when canceled externally
            cancelled = true;
            // reject(err);
        });

        let delayer = new ErrorDelay();
        while(!cancelled) {
            delayer.restoring();

            try {
                while (!cancelled) {
                    // Wait for new trades
                    let orders = await exchange.watchMyOrders(symbol);
                    // for each trade
                    cb(orders);
                }
            } catch (ex) {
                // "connection closed by remote server, closing code 1006"
                // "getaddrinfo ENOTFOUND api-pub.bitfinex.com"
                console.error(ex);
                if (ex instanceof ccxt.NetworkError) {
                    await delayer.errorAndWait();
                } else {
                    console.log("Exit listening trades")
                    // Exit if there is any error in the websocket connection
                    throw ex;
                }
            }
        }
        console.log("Exit listening trades")
        resolve();
    });
}

/**
 * Watch my executed trades from websocket events
 * 
 * @param {BaseExchange} exchange exchange class
 * @param {BalanceCallback} cb balance callback
 * 
 * @returns {{ret: function(): void, promise: Promise}}
 */
 function watchMyBalance(exchange, cb) {
    return cancelablePromise(async (resolve, reject, signal) => {
        let cancelled = false;
        signal.catch(err => {
            // Exit when canceled externally
            cancelled = true;
            // reject(err);
        });

        let delayer = new ErrorDelay();
        while(!cancelled) {
            delayer.restoring();

            try {
                while (!cancelled) {
                    // Wait for new trades
                    let balance = await exchange.watchBalance();
                    // for each trade
                    cb(balance);
                }
            } catch (ex) {
                // "connection closed by remote server, closing code 1006"
                // "getaddrinfo ENOTFOUND api-pub.bitfinex.com"
                console.error(ex);
                if (ex instanceof ccxt.NetworkError) {
                    await delayer.errorAndWait();
                } else {
                    console.log("Exit listening balance")
                    // Exit if there is any error in the websocket connection
                    throw ex;
                }
            }
        }
        console.log("Exit listening balance")
        resolve();
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
            response("ok");
        }, ms);

        signal.catch(err => {
            reject(err);
            clearInterval(interval);
        });

    });
}


module.exports = {
    cancelablePromise, 
    watchTrades,
    watchMyTrades,
    checkMyTradesInterval,
    watchMyBalance,
    watchMyOrders
}