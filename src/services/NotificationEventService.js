
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

/**
 * @typedef {Object} NotificationMessageData
 * @property {String} event
 * @property {int} level
 * @property {string} message
 * @property {Object} params
 */

class NotificationEventService extends EventService {
    constructor() {
        super("Notification");
    }
    
    send(event, level, message, params) {
        /** @type {NotificationMessageData} */
        let data = {
            event,
            level,
            message,
            params
        };

        this._send(data);
    }
}
const notificationEventService = new NotificationEventService();

module.exports = notificationEventService;
