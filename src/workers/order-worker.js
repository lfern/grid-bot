const { BaseExchangeCcxtOrder } = require("../crypto/exchanges/ccxt/BaseExchangeCcxtOrder");
const { orderHandler } = require("../grid/redis-events");
const Redlock = require("redlock");

/** @typedef {import("../services/OrderEventService").OrderDataEvent} OrderDataEvent */

/**
 * 
 * @param {Redlock} redlock 
 * @returns 
 */
exports.orderWorker = function(redlock) {
    return async (job, done) => {
        /** @type {OrderDataEvent} */
        let data = job.data;
        let dataOrder = BaseExchangeCcxtOrder.fromJson(data.order);
        let delayed = data.delayed;
        let fromExchangeStr = delayed === undefined ? 'not-recovered' : 'recovered';
        let delayedStr = delayed === undefined ? 'delayed-n/a' : (delayed?'delayed':'not-delayed');
        console.log(`OrderWorker: received order ${dataOrder.id} ${dataOrder.status} ${dataOrder.side} ${dataOrder.symbol} ${fromExchangeStr} ${delayedStr}`);
        try {
            await orderHandler(redlock, data.account, dataOrder, delayed);
        } catch (ex) {
            console.error("OrderWorker:", ex);
        }

        done(null, { message: "order executed" });
    };
};