
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

/**
 * OrderDataEvent type definitions
 * @typedef {Object} OrderDataEvent
 * @property {string} account
 * @property {BaseExchangeOrder} order
 * @property {boolean} [delayed]
 */

class OrderEventService extends EventService {
    constructor() {
        super("Order");
    }

    send(account, order, delayed = undefined) {
        /** @type {OrderDataEvent} */
        let data = {
            account,
            order,
            delayed
        };

        this._send(data);
    }
}
const orderEventService = new OrderEventService();

module.exports = orderEventService;
