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

    var StrategyInstanceGrid = sequelize.define('StrategyInstanceGrid', {
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
        price: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        buy_order_id: {
            allowNull: false,
            type:DataTypes.INTEGER
        },
        buy_order_qty: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        buy_order_cost: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        sell_order_id: {
            allowNull: false,
            type:DataTypes.INTEGER
        },
        sell_order_qty: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        sell_order_cost: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        position_before_order: {
            allowNull: true,
            type: DataTypes.DECIMAL(30,15),
        },
        order_qty: {
            allowNull: true,
            type: DataTypes.DECIMAL(30,15),
        },
        side: {
            allowNull: true,
            type: DataTypes.ENUM('buy', 'sell'),
        },
        active: {
            allowNull: true,
            type: DataTypes.BOOLEAN,
        },
        exchange_order_id: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        order_id: {
            allowNull: true,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'strategy_instance_orders'
                },
                key: 'id'
            }
        },
        matching_order_id: {
            allowNull: true,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'strategy_instance_orders'
                },
                key: 'id'
            }
        },
        filled: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
    }, {
        tableName: 'strategy_instance_grids'
    });
 
    StrategyInstanceGrid.associate = function(models) {
        models.StrategyInstanceGrid.StrategyInstance = models.StrategyInstanceGrid.belongsTo(models.StrategyInstance, {
            as: 'strategy_instance',
            foreignKey: 'strategy_instance_id'
        });

        models.StrategyInstanceGrid.StrategyInstanceRecoveryGrid = models.StrategyInstanceGrid.hasMany(models.StrategyInstanceRecoveryGrid, {
            as: 'recovery_grids',
            foreignKey: 'strategy_instance_grid_id'
        });
    }
    

    return StrategyInstanceGrid;
}
