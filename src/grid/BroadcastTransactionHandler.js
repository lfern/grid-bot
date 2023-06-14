const models = require('../../models');
const { BroadcastTransactionRepository } = require('../../repository/BroadcastTransactionRepository');
const broadcastService = require('../services/BroadcastTransactionService');

const broadcastRepository = new BroadcastTransactionRepository();

const sendPendingTransactions = async function (isCancelledFn = () => false) {
    while(!isCancelledFn()) {
        console.log("Check pending broadcast transaccions...");
        let broadcastTransaction = await broadcastRepository.nextTransactionPendingAndSetSent();
        if (broadcastTransaction == null) {
            break;
        }

        // 
        console.log(`Trying to send broadcast transaction ${broadcastTransaction.id} ...`);
        try {
            let txid = await broadcastService.send(broadcastTransaction.transaction_raw);
            broadcastTransaction.txid = txid;
            broadcastTransaction.status = 'sent';
            await broadcastTransaction.save();
            console.log(`Broadcast transaction ${broadcastTransaction.id} sent with ${txid}`);
        } catch (ex) {
            console.error(`Error sending broadcast transaction ${broadcastTransaction.id}`, ex);
            broadcastTransaction.sent_at = null;
            broadcastTransaction.error = ex.message;
            await broadcastTransaction.save();
            break;
        }
    } 
}

const checkSentTransactions = async function(isCancelledFn = () => false) {
    console.log("Check status sent broadcast transaccions...");
    let pendingTransactions = await broadcastRepository.getPendingTransactions(10);

    for(let i=0;i<pendingTransactions.length && !isCancelledFn(); i++) {
        let pendingTransaction = pendingTransactions[i];
        try {
            console.log(`Checking broadcast transaction ${pendingTransaction.id} ${pendingTransaction.txid}`);
            let response = await broadcastService.get(pendingTransaction.txid);

            if (response.status && response.status.confirmed == true) {
                console.log(`Broadcast transaction ${pendingTransaction.id} confirmed`);
                pendingTransaction.transaction = response;
                pendingTransaction.status = 'confirmed';
                pendingTransaction.fee = response.fee;
                await pendingTransaction.save();
            } else {
                    if (pendingTransaction.request_status_count > 100) {
                        console.log(`Broadcast transaction ${pendingTransaction.id} max count reached`);
                        pendingTransaction.request_status_count = pendingTransaction.request_status_count + 1;
                        pendingTransaction.status = 'error';
                        await pendingTransaction.save(); 
                    } else {
                        pendingTransaction.request_status_count = pendingTransaction.request_status_count + 1;
                        await pendingTransaction.save(); 
                    }
            }
        } catch (ex) {
            console.log(`Error getting broadcast transaction status for ${pendingTransaction.id}`,  ex);
            pendingTransaction.error = ex.message;
            await pendingTransaction.save(); 
        }
    }
        console.log("Check status sent broadcast transaccions...");

}

exports.execute = async function(isCancelledFn = () => false) {
    // send pending transactions
    await sendPendingTransactions(isCancelledFn);

    // check transactions sent
    await checkSentTransactions(isCancelledFn);

}