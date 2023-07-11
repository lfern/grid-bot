
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

class StopGridEventService extends EventService {
    constructor() {
        super("StopGrid");
    }

    send(gridId) {
        this._send(gridId);
    }
}
const stopGridEventService = new StopGridEventService();

module.exports = stopGridEventService;
