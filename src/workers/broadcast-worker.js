const { cancelablePromise } = require("../crypto/exchanges/utils/procutils");
const {sleep} = require('../crypto/exchanges/utils/timeutils');
const broadcastTransactionHandler = require('../grid/BroadcastTransactionHandler');


exports.broadcastWorkerPromise = function() {
    return cancelablePromise( async (resolve, reject, signal) => {
        let cancelled = false;

        signal.catch(err => {
            cancelled = true;
        });

        try {
            while(!cancelled) {
                try {
                    broadcastTransactionHandler.execute(() => cancelled);
                } catch (ex) {
                    console.log("Error", ex);
                }

                await sleep(5000);
            }

            resolve();
        } catch (ex) {
            reject(ex);
        }
    });
};
