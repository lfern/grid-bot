
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

class GridNoFundsEventService extends EventService {
    constructor() {
        super("NoFunds");
    }
    
    send(gridId) {
        this._send(gridId);
    }
}
const gridNoFundsEventService = new GridNoFundsEventService();

module.exports = gridNoFundsEventService;
