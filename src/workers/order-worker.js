const { BaseExchangeCcxtOrder } = require("../crypto/exchanges/ccxt/BaseExchangeCcxtOrder");
const { orderHandler } = require("../grid/redis-events");
const Redlock = require("redlock");

/** @typedef {import("../grid/exchange-events").OrderDataEvent} OrderDataEvent */

/**
 * 
 * @param {Redlock} redlock 
 * @returns 
 */
exports.orderWorker = function(redlock, myOrderSenderQueue) {
    return async (job, done) => {
        /** @type {OrderDataEvent} */
        let data = job.data;
        let dataOrder = BaseExchangeCcxtOrder.fromJson(data.order);
        console.log("Order:", data);

        try {
            await orderHandler(redlock, myOrderSenderQueue, data.account, dataOrder);
        } catch (ex) {
            console.error("Error", ex);
        }

        done(null, { message: "order executed" });
    };
};