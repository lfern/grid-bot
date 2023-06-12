
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

class CheckAccountDepositEventService extends EventService {
    constructor() {
        super("CheckAccountDeposit");
    }
    
    send(gridId) {
        this._send(gridId);
    }
}
const checkAccountDepositEventService = new CheckAccountDepositEventService();

module.exports = checkAccountDepositEventService;
