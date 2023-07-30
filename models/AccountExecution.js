'use strict';

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * Account model
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {

    var AccountExecution = sequelize.define('AccountExecution', {
        id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.BIGINT,
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
        exchange: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        exchange_holder: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        exchange_account: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        wallet: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        symbol: {
            allowNull: false,
            type: DataTypes.STRING
        },
        exchange_order_id: {
            allowNull: false,
            type: DataTypes.STRING
        },
        exchange_trade_id: {
            allowNull: false,
            type: DataTypes.STRING
        },
        ts: {
            allowNull: false,
            type: DataTypes.BIGINT
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
        matched_exchange_order_id: {
            allowNull: true,
            type: DataTypes.STRING
        },
        instance_tag: {
            allowNull: true,
            type: DataTypes.STRING
        },
    }, {
        tableName: 'account_executions'
    });
 
    AccountExecution.associate = function(models) {
        models.AccountExecution.Account = models.AccountExecution.belongsTo(models.Account, {
            as: 'account',
            foreignKey: 'account_id'
        });
    }

    return AccountExecution;
}