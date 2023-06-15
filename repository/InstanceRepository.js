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

    async resetNoFundsRunningGrids4Account(accountId) {
        let nofundsGridsIds = [];
        await models.sequelize.transaction(async (transaction) => {
            let nofundsGrids = await models.StrategyInstance.findAll({
                where:{
                    '$strategy.account_id$': accountId,
                    running: true,
                    nofunds: true,
                },
                include: [models.StrategyInstance.Strategy],           
                transaction
            });

            nofundsGridsIds = nofundsGrids.map(x => x.id);

            if (nofundsGrids.length > 0) {

                await models.StrategyInstance.update({
                    nofunds: false,
                    nofunds_at: null,
                    nofunds_currency: null
                }, {
                    where: {
                        id: nofundsGridsIds,
                    },
                    transaction
                });
            }
        });

        return nofundsGridsIds;
    }

    async noFunds(grid, currency) {
        await models.StrategyInstance.update({
            nofunds: true,
            nofunds_at: models.sequelize.fn("NOW"),
            currency: currency
        }, {
            where: {
                id: grid,
                nofunds: false,
            }
        });
    }
}

module.exports = {InstanceRepository}