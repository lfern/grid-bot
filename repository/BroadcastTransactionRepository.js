const models = require('../models');

class BroadcastTransactionRepository {

    async getPendingTransactions(limit) {
        return await models.BroadcastTransaction.findAll({
            where: {
                status: 'sent',
                txid: {
                    [models.Sequelize.Op.ne]: null
                }
            },
            order: [
                ['updatedAt', 'ASC'],
            ],
            limit: limit,
        });
    }

    /**
     * 
     * @param {string} accountId 
     * @returns {Object[]}
     */
    async getTransactionsWithoutDepositForAccount(accountId) {
        let results = await models.BroadcastTransaction.findAll({
            where: {
                account_id: accountId,
                status: {[models.Sequelize.Op.in]: ['sent', 'confirmed']},
                deposit_status: 'pending'
            }
        });

        return results;
    }

    async nextTransaction4Account(account) {
        let broadcastTransaction = null;
        await models.sequelize.transaction(async (transaction) => {
            broadcastTransaction = await models.BroadcastTransaction.findOne({
                where: {
                    account_id: account,
                    status: 'created',
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
                order: [
                    ['updatedAt', 'ASC'],
                ],
            });
            if (broadcastTransaction != null) {
                broadcastTransaction.status = 'pending';
                broadcastTransaction.send_requested_at = models.sequelize.fn('NOW');
                broadcastTransaction.deposit_status = 'pending';
                await broadcastTransaction.save({transaction});
            }
        });

        return broadcastTransaction;
    }

    async nextTransactionPendingAndSetSent() {
        let broadcastTransaction = null;
        await models.sequelize.transaction(async (transaction) => {
            broadcastTransaction = await models.BroadcastTransaction.findOne({
                where: {
                    status: 'pending',
                    sent_at: null,
                    send_requested_at:{
                        [models.Sequelize.Op.ne]: null
                    }
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
                order: [
                    ['updatedAt', 'ASC'],
                ],
            });
            if (broadcastTransaction != null) {
                broadcastTransaction.sent_at = models.sequelize.fn('NOW');
                await broadcastTransaction.save({transaction});
            }
        });

        return broadcastTransaction;
    }

    async getTransactionsNotDeposited4Account(accountId) {
        return await models.BroadcastTransaction.findAll({
            where: {
                account_id: accountId,
                deposit_status: 'pending',
            }
        });
    }


}

module.exports = {BroadcastTransactionRepository}