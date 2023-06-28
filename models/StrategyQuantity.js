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

    var StrategyQuantity = sequelize.define('StrategyQuantity', {
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
        id_buy: {
            allowNull: false,
            type:DataTypes.INTEGER,
        },
        buy_order_qty: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        sell_order_qty: {
            allowNull: false,
            type: DataTypes.DECIMAL(30,15),
        },
        
    }, {
        tableName: 'strategy_quantities'
    });
 
    StrategyQuantity.associate = function(models) {
        models.StrategyQuantity.Strategy = models.StrategyQuantity.belongsTo(models.Strategy, {
            as: 'strategy',
            foreignKey: 'strategy_id'
        });
    }

    return StrategyQuantity;
}
