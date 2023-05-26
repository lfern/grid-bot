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

    var AccountPendingOrder = sequelize.define('AccountPendingOrder', {
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
        order: {
            allowNull: false,
            type: DataTypes.JSONB,
        },
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE
        },
        order_id: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        delayed: {
            allowNull: false,
            type: DataTypes.BOOLEAN
        }


    }, {
        tableName: 'account_pending_orders'
    });
 
    AccountPendingOrder.Account = AccountPendingOrder.belongsTo(Account, {
        as: 'account',
        foreignKey: 'account_id'
    });

    return AccountPendingOrder;
}