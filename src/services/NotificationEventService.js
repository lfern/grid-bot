
/** @typedef {import('bull').Queue} Queue */

const { EventService } = require('./EventService');

const SCOPE_STRATEGY = 'strategy';
const SCOPE_OTHER = 'other';

/**
 * @typedef {Object} NotificationMessageDataScope
 * @property {string} scope
 * @property {int|undefined} strategyId
 */

/**
 * @typedef {Object} NotificationMessageData
 * @property {String} event
 * @property {int} level
 * @property {string} message
 * @property {NotificationMessageDataScope|undefined} scope
 * @property {Object} params
 */

class NotificationEventService extends EventService {
    constructor() {
        super("Notification");
    }
    
    /**
     * 
     * @param {string} event 
     * @param {int} level 
     * @param {string} message 
     * @param {NotificationMessageDataScope} scope 
     * @param {Object} params 
     */
    send(event, level, message, scope, params) {
        /** @type {NotificationMessageData} */
        let data = {
            event,
            level,
            message,
            scope,
            params
        };

        this._send(data);
    }
}
const notificationEventService = new NotificationEventService();

module.exports = {
    NotificationEventService: notificationEventService,
    SCOPE_STRATEGY,
    SCOPE_OTHER,
}
