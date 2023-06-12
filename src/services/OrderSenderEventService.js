
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

class OrderSenderEventService extends EventService {
    constructor() {
        super("OrderSender");
    }

    send(gridId) {
        this._send(gridId);
    }
}
const orderSenderEventService = new OrderSenderEventService();

module.exports = orderSenderEventService;
