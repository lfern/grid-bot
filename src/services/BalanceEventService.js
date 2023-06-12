
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

/**
 * BalanceDataEvent type definitions
 * @typedef {Object} BalanceDataEvent
 * @property {string} account
 * @property {Balance} balance
 * @property {string} accountType
 */

class BalanceEventService extends EventService {
    constructor() {
        super("Balance");
    }

    send(account, balance, accountType) {
        /** @type {BalanceDataEvent} */
        let data = {
            account,
            balance,
            accountType
        };

        this._send(data);
    }
}
const balanceEventService = new BalanceEventService();

module.exports = balanceEventService;
