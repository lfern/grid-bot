'use strict';

const BroadcastTransactionModel = require('./BroadcastTransaction');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * Account model
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const BroadcastTransaction = BroadcastTransactionModel(sequelize, DataTypes);

    var BroadcastTransactionAddress = sequelize.define('BroadcastTransactionAddress', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        broadcast_transaction_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'broadcast_transactions'
                },
                key: 'id'
            }
        },
        address: {
            allowNull: false,
            type: DataTypes.STRING,
        }
    }, {
        tableName: 'broadcast_addresses'
    });
 
    BroadcastTransactionAddress.associate = function(models) {
        models.BroadcastTransactionAddress.BroadcastTransaction = models.BroadcastTransactionAddress.belongsTo(models.BroadcastTransaction, {
            as: 'transaction',
            foreignKey: 'broadcast_transaction_id'
        });
    }

    return BroadcastTransactionAddress;
}