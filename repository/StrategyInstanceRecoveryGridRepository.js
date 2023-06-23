const models = require('../models');

/** @typedef {import('../src/crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */

const PHASE_DOWNLOADING = 'downloading';
const PHASE_FIXING = 'fixing';
const PHASE_CHECKING = 'checking';

const STATUS_DOWNLOADED = 'downloaded';
const STATUS_EXECUTED = 'executed';
const STATUS_EXECUTED_ORDER_CREATED = 'executed-order-created';
const STATUS_ALL_DOWNLOADED = 'all-downloaded';

class StrategyInstanceRecoveryGridRepository {

    /**
     * Add orders to recovery orders table
     * @param {BaseExchangeOrder[]} orders 
     */
    async addOrders(strategyId, orders) {
        for (let i=0; i < order.length; i++) {
            let order = orders[i];
            await models.StrategyInstanceRecoveryGridOrder.findOrCreate({
                where: {
                    strategy_instance_id: strategyId,
                    order_id: order.id
                },
                defaults: {
                    strategy_instance_id: instanceId,
                    status: STATUS_DOWNLOADED,
                    order_id: order.id,
                    order: order.toJson(),
                    execution_timestamp: order.timestamp,
                    creation_timestamp: order.timestamp_creation,
                }
            });
        }
    }
    

    /**
     * Remove all orders from recovery table
     * 
     * @param {int} instanceId 
     */
    async cleanup(instanceId) {
        await models.StrategyInstanceRecoveryGridOrder.destroy({
            where: {strategy_instance_id: instanceId}
        });
    }

    /**
     * Get current recovery phase from recovery table
     * 
     * @param {int} instanceId 
     * @returns {string}
     */
    async getCurrentRecoveryPhase(instanceId) {
        let result = await models.StrategyInstanceRecoveryGridOrder.findAll({
            where: {strategy_instance_id: instanceId},
            attributes: ['status'],
            group: ['status']
        });

        let allDownloaded = false;
        let someDownloaded = false;
        result.forEach(element => {
            if (element.status == STATUS_ALL_DOWNLOADED) {
                allDownloaded = true;
            } else if (element.status == STATUS_DOWNLOADED) {
                someDownloaded = true;
            }
        });

        return !allDownloaded ? PHASE_DOWNLOADING : (someDownloaded ? PHASE_FIXING : PHASE_CHECKING);
    }

    /**
     * Return timestamp of last order downloaded in recovery table, or timestamp of the first open order in grid 
     * 
     * @param {int} instanceId 
     * @returns {Date | null}
     */
    async getLastOrderTimestamp(instanceId) {
        let order = await models.StrategyInstanceRecoveryGridOrder.findOne({
            where: {
                strategy_instance_id: instanceId,
            },
            order: [
                ['creation_timestamp', 'DESC']
            ],
            limit: 1
        });

        if (order != null) {
            return order.creation_timestamp;
        }
        // look for open order with lowest timestamp creation
        order = await models.StrategyInstanceOrder.findOne({
            where: {
                id: instanceId,
                status: 'open'
            },
            order: [
                ['creation_timestamp', 'DESC']
            ],
            limit: 1
        });

        if (order != null) {
            return order.creation_timestamp;
        }

        return null;
    }

    /**
     * Get next order executed in the exchange
     * 
     * @param {int} instanceId 
     * @returns 
     */
    async getNextExecution(instanceId) {
        return await models.StrategyInstanceRecoveryGridOrder.findOne({
            where: {
                strategy_instance_id: instanceId,
                status: STATUS_DOWNLOADED,
            },
            order: [
                ['execution_timestamp', 'ASC']
            ],
            limit: 1
        });
    }

    /**
     * Set all orders downloaded from exchange
     * 
     * @param {int} instanceId 
     */
    async noMoreOrdersPending(instanceId) {
        await models.StrategyInstanceRecoveryGridOrder.findOrCreate({
            where: {
                strategy_instance_id: instanceId,
                status: STATUS_ALL_DOWNLOADED
            },
            defaults: {
                strategy_instance_id: instanceId,
                status: STATUS_ALL_DOWNLOADED,
            }
        });
    }

    /**
     * Check if any order was created order when executed status
     * 
     * @param {int} instanceId 
     * @returns 
     */
    async ordersCreatedLastPhase(instanceId) {
        let count = await models.StrategyInstanceRecoveryGridOrder.count({
            where: {
                strategy_instance_id: instanceId,
                status: STATUS_EXECUTED_ORDER_CREATED 
            }
        });
        
        return count > 0;
        
    }

    /**
     * Remove all orders downloaded status
     * 
     * @param {int} instanceId 
     */
    async resetNoMoreOrdersPending(instanceId) {
        await models.sequelize.transaction(async (transaction) => {
            await models.StrategyInstanceRecoveryGridOrder.update({
                status: STATUS_EXECUTED 
            }, {
                where: {
                    status: STATUS_EXECUTED_ORDER_CREATED,
                    strategy_instance_id: instanceId
                },
                transaction
            });

            await models.StrategyInstanceRecoveryGridOrder.destroy({
                where : {
                    status: STATUS_ALL_DOWNLOADED,
                    strategy_instance_id: instanceId
                },
                transaction
            })
        });
    }
 }

 module.exports = { 
    StrategyInstanceRecoveryGridRepository,
    PHASE_DOWNLOADING,
    PHASE_FIXING,
    PHASE_CHECKING,
}