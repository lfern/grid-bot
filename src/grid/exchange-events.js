const {watchMyTrades, watchMyBalance, watchMyOrders} = require('../crypto/exchanges/utils/procutils');
const TradeEventService = require('../services/TradeEventService');
const OrderEventService = require('../services/OrderEventService');
const BalanceEventService = require('../services/BalanceEventService');

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */
/** @typedef {import('../crypto/exchanges/BaseExchangeTrade').BaseExchangeTrade} BaseExchangeTrade */
/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */
/** @typedef {import('ccxt').Balance} Balance */
/** @typedef {import('bull').Queue} Queue */

/**
 * 
 * @param {string} account 
 * @param {BaseExchange} exchange 
 * @returns 
 */
exports.tradeEventHandler = function(account, exchange) {
    return watchMyTrades(exchange, undefined, (trades) => {        
        let symbols = exchange.symbols;
        // send to redis
        for(let i=0;i<trades.length;i++) {
            let trade = trades[i];
            if (!symbols.includes(trade.symbol)) {
                console.log(`TradeEventHandler: received trade (other account - DISCARD) ${account} ${trade.id} ${trade.side} ${trade.symbol} ${trade.order}`);
                continue;
            }

            console.log(`TradeEventHandler: received trade ${account} ${trade.id} ${trade.side} ${trade.symbol} ${trade.order}`);
            TradeEventService.send(account, trade.toJson());
        }

    });
};

/**
 * 
 * @param {string} account 
 * @param {BaseExchange} exchange 
 * @returns 
 */
exports.orderEventHandler = function(account, exchange) {
    return watchMyOrders(exchange, undefined, (orders) => {
        let symbols = exchange.symbols;
        for(let i=0;i<orders.length;i++) {
            let order = orders[i];
            // send to redis
            if (!symbols.includes(order.symbol)) {
                console.log(`OrderEventHandler: received order (other account - DISCARD) ${account} ${order.id} ${order.status} ${order.side} ${order.symbol}`);
                continue;
            }

            console.log(`OrderEventHandler: received order ${account} ${order.id} ${order.status} ${order.side} ${order.symbol}`);
            OrderEventService.send(account, order.toJson());
        }
    });
};

/**
 * 
 * @param {string} account 
 * @param {BaseExchange} exchange 
 * @param {string|undefined} accountType
 * @returns 
 */
exports.balanceEventHandler = function(account, exchange, accountType = undefined) {
    return watchMyBalance(exchange, (balance, accountType) => {
        console.log(`BalanceEventHandler: balanced received ${account} ${accountType}`);
        // send to redis
        BalanceEventService.send(account, balance, accountType);
    }, accountType);
};

