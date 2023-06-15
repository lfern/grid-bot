
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');


/**
 * @typedef {Object} GridNoFundsMessageData
 * @property {int} grid
 * @property {String} currency
 */

class GridNoFundsEventService extends EventService {
    constructor() {
        super("NoFunds");
    }

    send(grid, currency) {
        /** @type {GridNoFundsMessageData} */
        let data = {
            grid, currency
        }
    
        this._send(data);
    }
}
const gridNoFundsEventService = new GridNoFundsEventService();

module.exports = gridNoFundsEventService;
