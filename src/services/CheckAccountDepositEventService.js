
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');


/**
 * @typedef {Object} CheckAccountDepositEventData
 * @property {String} account
 * @property {boolean} transferFromMainWallet
 */

class CheckAccountDepositEventService extends EventService {
    constructor() {
        super("CheckAccountDeposit");
    }
    send(account, transferFromMainWallet) {
        /** @type {CheckAccountDepositEventData} */
        let data = {
            account,
            transferFromMainWallet
        }    
        this._send(data);
    }
}
const checkAccountDepositEventService = new CheckAccountDepositEventService();

module.exports = checkAccountDepositEventService;
