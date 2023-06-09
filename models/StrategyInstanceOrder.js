'use strict';

const StrategyInstanceModel = require('./StrategyInstance');
const AccountModel = require('./Account');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const StrategyInstance = StrategyInstanceModel(sequelize, DataTypes);
    const Account = AccountModel(sequelize, DataTypes);

    var StrategyInstanceOrder = sequelize.define('StrategyInstanceOrder', {
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
        exchange_order_id: {
            allowNull: false,
            type: DataTypes.STRING
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING
        },
        order_type: {
            allowNull: false,
            type: DataTypes.ENUM('market', 'limit')
        },
        side: {
            allowNull: false,
            type: DataTypes.ENUM('buy', 'sell')
        },
        creation_timestamp: {
            allowNull: false,
            type: DataTypes.DATE
        },
        creation_datetime: {
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
        status: {
            allowNull: false,
            type: DataTypes.ENUM('open', 'closed', 'expired', 'canceled', 'rejected')
        },
        price: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
        amount: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
        cost: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
        average: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
        filled: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
        },
        remaining: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15)
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
        trades_ok: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        trades_filled: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15),
            defaultValue: 0
        },
    }, {
        tableName: 'strategy_instance_orders'
    });
 
    StrategyInstanceOrder.associate = function(models) {
        models.StrategyInstanceOrder.StrategyInstance = models.StrategyInstanceOrder.belongsTo(models.StrategyInstance, {
            as: 'strategy_instance',
            foreignKey: 'strategy_instance_id'
        });

        models.StrategyInstanceOrder.Account = models.StrategyInstanceOrder.belongsTo(models.Account, {
            as: 'account',
            foreignKey: 'account_id'
        });
    }

    return StrategyInstanceOrder;
}
