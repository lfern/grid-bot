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
        average: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15)
        },
        filled: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15)
        },
        remaining: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15)
        }
    }, {
        tableName: 'strategy_instance_orders'
    });
 
    StrategyInstanceOrder.StrategyInstance = StrategyInstanceOrder.belongsTo(StrategyInstance, {
        as: 'strategy_instance',
        foreignKey: 'strategy_instance_id'
    });

    StrategyInstanceOrder.Account = StrategyInstanceOrder.belongsTo(Account, {
        as: 'account',
        foreignKey: 'account_id'
    });

    return StrategyInstanceOrder;
}
