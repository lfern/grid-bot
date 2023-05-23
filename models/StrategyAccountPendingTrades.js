'use strict';

const AccountModel = require('./Account');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const Account = AccountModel(sequelize, DataTypes);

    var AccountPendingTrade = sequelize.define('AccountPendingTrade', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
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
        trade: {
            allowNull: false,
            type: DataTypes.JSONB,
        },
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE
        },
        trade_id: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        order_id: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING,
        },

    }, {
        tableName: 'account_pending_trades'
    });
 
    AccountPendingTrade.Account = AccountPendingTrade.belongsTo(Account, {
        as: 'account',
        foreignKey: 'account_id'
    });

    return AccountPendingTrade;
}