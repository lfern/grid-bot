'use strict';

const StrategyTypeModel = require('./StrategyType');
const AccountModel = require('./Account');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const StrategyType = StrategyTypeModel(sequelize, DataTypes);
    const Account = AccountModel(sequelize, DataTypes);

    var Strategy = sequelize.define('Strategy', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        strategy_type_id: {
            allowNull: false,
            type: DataTypes.UUID,
            references: {
                model: {
                    tableName: 'strategy_types'
                },
                key: 'id'
            }
        },
        strategy_name: {
            allowNull: false,
            type: DataTypes.STRING
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
            type: DataTypes.STRING,
        },
        initial_position: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15),
        },
        order_qty: {
            allowNull: false,
            type: DataTypes.DECIMAL(30, 15),
        },
        buy_orders: {
            allowNull: false,
            type: DataTypes.INTEGER,
        },
        sell_orders: {
            allowNull: false,
            type: DataTypes.INTEGER,
        },
        active_buys: {
            allowNull: false,
            type: DataTypes.INTEGER,
        },
        active_sells: {
            allowNull: false,
            type: DataTypes.INTEGER,
        },
        step: {
            allowNull: false,
            type: DataTypes.DECIMAL(5,2),
        },
        step_type: {
            allowNull: false,
            type: DataTypes.ENUM('percent', 'absolute'),
        }
    }, {
        tableName: 'strategies'
    });
 
    Strategy.StrategyType = Strategy.belongsTo(StrategyType, {
        as: 'strategy_type',
        foreignKey: 'strategy_type_id'
    });

    Strategy.Account = Strategy.belongsTo(Account, {
        as: 'account',
        foreignKey: 'account_id'
    });

    return Strategy;
}