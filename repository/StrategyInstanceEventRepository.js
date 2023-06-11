const models = require('../models');
const NotificationService = require('../src/services/NotificationService');

const LEVEL_CRITICAL = 3; 
const LEVEL_ERROR = 2;
const LEVEL_WARN = 1; 
const LEVEL_INFO = 0; 

class StrategyInstanceEventRepository {

    /**
     * 
     * @param {Object} instance 
     * @param {String} event 
     * @param {int} level 
     * @param {string} message 
     * @param {Object} params 
     */
    async create(instance, event, level, message, params = {}) {
        await models.StrategyInstanceEvent.create({
            strategy_instance_id: instance.id,
            event: event,
            level: level,
            message: message,
            params: params,
        });

        let strategy = instance.strategy;
        if (!strategy) {
            strategy = await models.Strategy.findOne({where: {id: instance.strategy_id}});
        }

        let notifMsg = `${strategy.strategy_name}: ${message}`;
        NotificationService.send(event, level, notifMsg, params);
    }
}

module.exports = {
    StrategyInstanceEventRepository,
    LEVEL_CRITICAL,
    LEVEL_ERROR,
    LEVEL_WARN,
    LEVEL_INFO
}