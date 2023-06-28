'use strict';

const StrategyModel = require('./Strategy');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const Strategy = StrategyModel(sequelize, DataTypes);

    var StrategyInstance = sequelize.define('StrategyInstance', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        strategy_id: {
            allowNull: false,
            type: DataTypes.UUID,
            references: {
                model: {
                    tableName: 'strategies'
                },
                key: 'id'
            }
        },
        running: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        started_at: {
            allowNull: true,
            type: DataTypes.DATE,
        },
        stopped_at: {
            allowNull: true,
            type: DataTypes.DATE,
        },
        stop_requested_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        is_dirty: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        dirty_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        nofunds: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        nofunds_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        nofunds_currency: {
            allowNull: true,
            type: DataTypes.STRING,
        }
    }, {
        tableName: 'strategy_instances'
    });

    StrategyInstance.associate = function(models) {
        models.StrategyInstance.Strategy = models.StrategyInstance.belongsTo(models.Strategy, {
            as: 'strategy',
            foreignKey: 'strategy_id'
        });

        models.StrategyInstance.StrategyInstanceGrid = models.StrategyInstance.hasMany(models.StrategyInstanceGrid, {
            as: 'grid',
            foreignKey: 'strategy_instance_id'
        });
    }

    return StrategyInstance;
}
