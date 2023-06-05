const models = require('../models');

class InstanceRepository {
    async getInstance(id, join = true) {
        let options = {
            where: {
                id: id,
            },
        };

        if (join) {
            options.include = [
                {
                    association: models.StrategyInstance.Strategy,
                    include: [
                        {
                            association: models.Strategy.Account,
                            include: [
                                models.Account.Exchange,
                                models.Account.AccountType
                            ]
                        }
                    ]
                }
            ];
        }
        return await models.StrategyInstance.findOne(options);
    }

    async getInstancesToBeStarted(join = true) {
        let options = {
            where: {
                running: true,
                started_at: { [models.Sequelize.Op.is]: null },
                stop_requested_at: { [models.Sequelize.Op.is]: null }
            }
        };

        if (join) {
            options.include = [
                {
                    association: models.StrategyInstance.Strategy,
                    include: [
                        {
                            association: models.Strategy.Account,
                            include: [
                                models.Account.Exchange,
                                models.Account.AccountType
                            ]
                        }
                    ]
                }
            ];
        }
        return await models.StrategyInstance.findAll(options);
    }

    async getInstanceForOrder(order, join = true) {
        let options = {
            where: {
                id: order.strategy_instance_id,
                // running: true,
                // stop_requested_at: { [models.Sequelize.Op.is]: null }
            }
        };

        if (join) {
            options.include =  [
                {
                    association: models.StrategyInstance.Strategy,
                    include: [
                        {
                            association: models.Strategy.Account,
                            include: [
                                models.Account.Exchange,
                                models.Account.AccountType
                            ]
                        }
                    ]
                }
            ];
        }
        return await models.StrategyInstance.findOne(options);
    }
}

module.exports = {InstanceRepository}