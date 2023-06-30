'use strict';

const StrategyInstanceOrderModel = require('./StrategyInstanceOrder');
const AccountModel = require('./Account');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const StrategyInstanceOrder = StrategyInstanceOrderModel(sequelize, DataTypes);
    const Account = AccountModel(sequelize, DataTypes);

    var StrategyInstanceTrade = sequelize.define('StrategyInstanceTrade', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        strategy_instance_order_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'strategy_instance_orders'
                },
                key: 'id'
            }
        },
        account_id: {
            allowNull: false,
            type: DataTypes.UUID,
            references: {
                model: {
                    tableName: 'accounts'
                },
                key: 'id'
            }
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING
        },
        exchange_trade_id: {
            allowNull: false,
            type: DataTypes.STRING
        },
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE
        },
        datetime: {
            allowNull: false,
            type: DataTypes.STRING
        },
        price: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15)
        },
        amount: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15)
        },
        cost: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15)
        },
        fee_cost: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
        fee_coin: {
            allowNull: true,
            type: DataTypes.STRING
        },
        taker_or_maker: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        side: {
            allowNull: true,
            type: DataTypes.ENUM('buy', 'sell')
        },
        exchange_order_id: {
            allowNull: true,
            type: DataTypes.STRING
        }
    }, {
        tableName: 'strategy_instance_trades'
    });
 
    StrategyInstanceTrade.associate = function(models) {
        models.StrategyInstanceTrade.StrategyInstanceOrder = models.StrategyInstanceTrade.belongsTo(models.StrategyInstanceOrder, {
            as: 'strategy_instance_order',
            foreignKey: 'strategy_instance_order_id'
        });

        models.StrategyInstanceTrade.Account = models.StrategyInstanceTrade.belongsTo(models.Account, {
            as: 'account',
            foreignKey: 'account_id'
        });
    }

    return StrategyInstanceTrade;
}
