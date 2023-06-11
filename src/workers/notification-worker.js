const { notificationHandler } = require("../notifications/notifications");
const { Throttler } = require("../utils/Throttler");
/** @typedef {import("../notifications/notifications").NotificationMessageData} NotificationMessageData */
/** @typedef {import("bull").Queue} Queue */

const rateLimit = 250;
let throttler = new Throttler({
    delay: 0.001,
    capacity: 1,
    cost: 1,
    maxCapacity: 1000,
    refillRate: (rateLimit > 0) ? 1 / rateLimit : Number.MAX_VALUE,
});

/**
 * 
 * @param {Queue} queue 
 * @returns 
 */
exports.notificationWorker = function(telegramBotToken) {
    return async (job, done) => {
        /** @type {NotificationMessageData} */
        let data = job.data;

        console.log(`NotificationWorker: received notification ${data.event} ${data.level} ${data.message}`, data.params);
        try {
            await notificationHandler(data, job.timestamp, telegramBotToken);
        } catch (ex) {
            console.error("NotificationWorker:", ex);
        }

        done(null, { message: "notification executed" });
        await throttler.throttle(1);
    };
};