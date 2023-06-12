
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

/**
 * TradeDataEvent type definitions
 * @typedef {Object} TradeDataEvent
 * @property {string} account
 * @property {BaseExchangeTrade} trade
 */

class TradeEventService extends EventService {
    constructor() {
        super("Trade");
    }

    send(account, trade) {
        /** @type {TradeDataEvent} */
        let data = {
            account,
            trade
        };

        this._send(data);
    }
}
const tradeEventService = new TradeEventService();

module.exports = tradeEventService;
