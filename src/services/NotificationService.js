
/** @typedef {import('bull').Queue} Queue */

/**
 * @typedef {Object} NotificationMessageData
 * @property {String} event
 * @property {int} level
 * @property {string} message
 * @property {Object} params
 */

/** @type {Queue} */
let notificationQueue = null;
const options = {
    attempts: 0,
    removeOnComplete: true,
    removeOnFail: true,
};

/**
 * 
 * @param {Queue} queue 
 */
exports.init = function(queue) {
    notificationQueue = queue;
}

/**
 * 
 * @param {String} event 
 * @param {int} level 
 * @param {String} notifMsg 
 * @param {Object} params 
 */
exports.send = function(event, level, message, params) {
    if (notificationQueue) {
        /** @type {NotificationMessageData} */
        let data = {
            event,
            level,
            message,
            params
        };

        notificationQueue.add(data, options).then(res => {}).catch(ex => console.error(ex));
    }
}
