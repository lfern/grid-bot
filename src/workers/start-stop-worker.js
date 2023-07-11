const { cancelablePromise } = require("../crypto/exchanges/utils/procutils");
const { stopGrids, startGrids, checkSyncingGrids } = require("../grid/start-stop-process");
const {sleep} = require('../crypto/exchanges/utils/timeutils');
/** @typedef {import('bull').Queue} Queue} */

/**
 * 
 * @returns 
 */
exports.startStopProcessPromise = function() {
    return cancelablePromise(async (resolve, reject, signal) => {
        let cancelled = false;

        signal.catch(err => {
            cancelled = true;
        });

        try {
            while (!cancelled) {
                await stopGrids(() => cancelled)

                await checkSyncingGrids(() => cancelled)

                await startGrids(() => cancelled);

                if (cancelled) break;
                await sleep(10000);
            }   

            resolve();
        } catch (ex) {
            reject(ex);
        }
    });
};


