'use strict';

const StrategyInstanceGridModel = require('./StrategyInstanceGrid');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * StrategyInstanceRecoveryGrid model
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const StrategyInstanceGrid = StrategyInstanceGridModel(sequelize, DataTypes);

    var StrategyInstanceRecoveryGrid = sequelize.define('StrategyInstanceRecoveryGrid', {
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
        strategy_instance_grid_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'strategy_instance_grids'
                },
                key: 'id'
            }
        },
        order_qty: {
            allowNull: true,
            type: DataTypes.DECIMAL(30,15),
        },
        side: {
            allowNull: true,
            type: DataTypes.ENUM('buy', 'sell'),
        },
        exchange_order_id: {
            allowNull: true,
            type: DataTypes.STRING,
        }
    }, {
        tableName: 'strategy_instance_recovery_grids'
    });
 
    StrategyInstanceRecoveryGrid.StrategyInstance = StrategyInstanceRecoveryGrid.belongsTo(StrategyInstanceGrid, {
        as: 'strategy_instance_grid',
        foreignKey: 'strategy_instance_grid_id'
    });

    StrategyInstanceGrid.hasMany(StrategyInstanceRecoveryGrid, {
        as: 'recovery_grids'
    });

    return StrategyInstanceRecoveryGrid;
}