const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");
const models = require('../../models');
const {sleep} = require('../crypto/exchanges/utils/timeutils');
const { cancelablePromise } = require("../crypto/exchanges/utils/procutils");
const TradeEventService = require("../services/TradeEventService");

exports.recoverTradesWorkerPromise = function() {
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
                // let removed = await pendingAccountRepository.removeNotFoundTradesOlderThan(5 * 60);
                // console.log("RecoverTradesWorker: removed orders ", removed);
    
                await models.sequelize.transaction(async (transaction) =>{
                    let dbTrades = await pendingAccountRepository.getOldestTrades(50, 5, true, transaction);
                    rows = dbTrades.length;
                    if (rows == 0) {
                        return;
                    }
    
                    console.log(`RecoverTradesWorker: recover ${rows} pending trades ....`);
    
                    for(let i=0; i<rows; i++) {
                        let dbTrade = dbTrades[i];
                        console.log(`RecoverTradesWorker: account ${dbTrade.account_id} ${dbTrade.trade_id}`);
                        console.log(`RecoverTradesWorker: send trade sender event after trade recovered ${dbTrade.account_id} ${dbTrade.trade_id}`);
                        TradeEventService.send(
                            dbTrade.account_id,
                            dbTrade.trade,
                            true
                        );
                        // don't delete , just update updatedAt
                        dbTrade.changed('updatedAt', true);
                        await dbTrade.update({updatedAt: new Date()}, {transaction})
                    }
                })
    
                if (rows == 0) {
                    await sleep(5000);
                    continue;
                }
    
            } catch (ex) {
                console.log("RecoverTradesWorker:", ex);
                await sleep(5000);
            }
            
        }

        resolve();
    });
}