'use strict';

const StrategyInstanceModel = require('./StrategyInstance');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const StrategyInstance = StrategyInstanceModel(sequelize, DataTypes);

    var StrategyInstanceEvent = sequelize.define('StrategyInstanceEvent', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        strategy_instance_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'strategy_instances'
                },
                key: 'id'
            }
        },
        event: {
            allowNull: false,
            type: DataTypes.STRING
        },
        message: {
            allowNull: false,
            type: DataTypes.STRING
        },
        params: {
            allowNull: false,
            type: DataTypes.JSONB,
        },
        level: {
            allowNull: false,
            type: DataTypes.SMALLINT
        }
    }, {
        tableName: 'strategy_instance_events'
    });
 
    StrategyInstanceEvent.StrategyInstance = StrategyInstanceEvent.belongsTo(StrategyInstance, {
        as: 'strategy_instance',
        foreignKey: 'strategy_instance_id'
    });

    return StrategyInstanceEvent;
}
