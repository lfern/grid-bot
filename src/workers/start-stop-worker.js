const { cancelablePromise } = require("../crypto/exchanges/utils/procutils");
const { stopGrids, startGrids } = require("../grid/start-stop-process");
const {sleep} = require('../crypto/exchanges/utils/timeutils');
const Redlock = require("redlock");
/** @typedef {import('bull').Queue} Queue} */

/**
 * 
 * @param {Redlock} redlock 
 * @param {Queue} myOrderSenderQueue
 * @returns 
 */
exports.startStopProcessPromise = function(redlock, myOrderSenderQueue) {
    return cancelablePromise(async (resolve, reject, signal) => {
        let cancelled = false;

        signal.catch(err => {
            cancelled = true;
        });

        try {
            while (!cancelled) {
                await stopGrids(() => cancelled)

                await startGrids(redlock, myOrderSenderQueue, () => cancelled);

                if (cancelled) break;
                await sleep(10000);
            }   

            resolve();
        } catch (ex) {
            reject(ex);
        }
    });
};

