'use strict';

const AccountModel = require('./Account');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * Account model
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const Account = AccountModel(sequelize, DataTypes);

    var BroadcastTransaction = sequelize.define('BroadcastTransaction', {
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
        transaction_raw: {
            allowNull: false,
            type: DataTypes.STRING(65535),
        },
        transaction_hash: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        txid: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        transaction: {
            allowNull: true,
            type: DataTypes.JSONB,
        },
        status: {
            allowNull: false,
            type: DataTypes.ENUM('created', 'pending', 'sent', 'confirmed', 'error'),
            defaultValue: 'created'
        },
        error: {
            allowNull: true,
            type: DataTypes.STRING(4096),
        },
        fee: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15),
        },
        sent_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        valid: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        send_requested_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        request_status_count: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        deposit_id: {
            allowNull: true,
            type: DataTypes.STRING
        },
        deposited_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        deposit: {
            allowNull: true,
            type: DataTypes.JSONB
        },
        deposit_status: {
            allowNull: false,
            type: DataTypes.ENUM('n/a', 'pending', 'deposited', 'missing'),
            defaultValue: 'n/a'
        },
        currency: {
            allowNull: false,
            type: DataTypes.STRING,
        }
    }, {
        tableName: 'broadcast_transactions'
    });
 
    BroadcastTransaction.Account = BroadcastTransaction.belongsTo(Account, {
        as: 'account',
        foreignKey: 'account_id'
    });

    return BroadcastTransaction;
}