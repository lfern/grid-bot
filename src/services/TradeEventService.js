
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

/**
 * TradeDataEvent type definitions
 * @typedef {Object} TradeDataEvent
 * @property {string} account
 * @property {BaseExchangeTrade} trade
 * @property {boolean|undefined} delayed
 */

class TradeEventService extends EventService {
    constructor() {
        super("Trade");
    }

    send(account, trade, delayed = false) {
        /** @type {TradeDataEvent} */
        let data = {
            account,
            trade,
            delayed
        };

        this._send(data);
    }
}
const tradeEventService = new TradeEventService();

module.exports = tradeEventService;
