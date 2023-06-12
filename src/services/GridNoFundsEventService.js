
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

class NoFundEventService extends EventService {
    constructor() {
        super("NoFunds");
    }
    
    send(gridId) {
        this._send(gridId);
    }
}
const noFundEventService = new NoFundEventService();

module.exports = noFundEventService;
