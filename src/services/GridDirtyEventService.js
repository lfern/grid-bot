
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

class GridDirtyEventService extends EventService {
    constructor() {
        super("GridDirty");
    }

    send(gridId) {
        this._send(gridId);
    }
}
const gridDirtyEventService = new GridDirtyEventService();

module.exports = gridDirtyEventService;
