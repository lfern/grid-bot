'use strict';

const StrategyInstanceModel = require('./StrategyInstance');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * StrategyInstanceRecoveryGrid model
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const StrategyInstance = StrategyInstanceModel(sequelize, DataTypes);

    var StrategyInstanceRecoveryGridOrder = sequelize.define('StrategyInstanceRecoveryGridOrder', {
        id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE
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
        status: {
            allowNull: false,
            type: DataTypes.ENUM('downloaded', 'executed', 'executed-order-created', 'all-downloaded')
        },
        order_id: {
            allowNull: true,
            type: DataTypes.STRING,
            unique: true
        },
        order: {
            allowNull:true,
            type: DataTypes.JSONB,
        },
        execution_timestamp: {
            allowNull: true,
            type: DataTypes.INTEGER
        },
        creation_timestamp: {
            allowNull: true,
            type: DataTypes.INTEGER
        }
    }, {
        tableName: 'strategy_instance_recovery_grid_orders'
    });
 
    StrategyInstanceRecoveryGridOrder.associate = function(models) {
        models.StrategyInstanceRecoveryGridOrder.StrategyInstance = models.StrategyInstanceRecoveryGridOrder.belongsTo(models.StrategyInstance, {
            as: 'strategy_instance',
            foreignKey: 'strategy_instance_id'
        });
    }

    return StrategyInstanceRecoveryGridOrder;
}