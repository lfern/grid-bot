const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");
const models = require('../../models');
const {sleep} = require('../crypto/exchanges/utils/timeutils');
const { cancelablePromise } = require("../crypto/exchanges/utils/procutils");
const OrderEventService = require("../services/OrderEventService");

exports.recoverOrdersWorkerPromise = function() {
    return cancelablePromise( async (resolve, reject, signal) => {
        let cancelled = false;
    
        signal.catch(err => {
            cancelled = true;
        });
    
        let pendingAccountRepository = new PendingAccountRepository();
    
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
                        OrderEventService.send(
                            dbOrder.account_id,
                            dbOrder.order,
                            dbOrder.delayed
                        );
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