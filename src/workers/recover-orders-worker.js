const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");
const models = require('../../models');
const {sleep} = require('../crypto/exchanges/utils/timeutils');
const { cancelablePromise } = require("../crypto/exchanges/utils/procutils");

exports.recoverOrdersWorkerPromise = function(myOrdersQueue) {
    return cancelablePromise( async (resolve, reject, signal) => {
        let cancelled = false;
    
        signal.catch(err => {
            cancelled = true;
        });
    
        let pendingAccountRepository = new PendingAccountRepository();
        const options = {
            attempts: 0,
            removeOnComplete: true,
            removeOnFail: true,
        };
    
        while(!cancelled) {
            try {
                let rows = 0;
                
                // remove 5 minutes old orders
                let removed = await pendingAccountRepository.removeNotFoundOrdersOlderThan(5 * 60);
                console.log("RecoverOrdersWorker: removed orders ", removed);
    
                await models.sequelize.transaction(async (transaction) =>{
                    let dbOrders = await pendingAccountRepository.getOldestOrders(50, 5, true, transaction);
                    rows = dbOrders.length;
                    if (rows == 0) {
                        return;
                    }
    
                    console.log(`RecoverOrdersWorker: recover ${rows} pending orders ....`);
    
                    for(let i=0; i<rows; i++) {
                        let dbOrder = dbOrders[i];
                        console.log(`RecoverOrdersWorker: account ${dbOrder.account_id} ${dbOrder.order_id}`);
                        console.log(`RecoverOrdersWorker: send order sender event after order recovered ${dbOrder.account_id} ${dbOrder.order_id}`);
                        myOrdersQueue.add({
                            account: dbOrder.account_id,
                            order: dbOrder.order,
                            delayed: dbOrder.delayed,
                        }, options).then(ret => {
                            console.log(`RecoverOrdersWorker: redis added order sender event after order recovered ${dbOrder.account_id} ${dbOrder.order_id} ${ret.data.delayed}`);
                        }). catch(err => {
                            console.error("RecoverOrdersWorker:", err);
                        });
                        // don't delete , just update updatedAt
                        dbOrder.changed('updatedAt', true);
                        await dbOrder.update({updatedAt: new Date()}, {transaction})
                    }
                })
    
                if (rows == 0) {
                    await sleep(5000);
                    continue;
                }
    
            } catch (ex) {
                console.log("RecoverOrdersWorker:", ex);
                await sleep(5000);
            }
            
        }

        resolve();
    });
}