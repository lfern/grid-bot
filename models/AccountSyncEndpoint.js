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

    var AccountSyncEndpoint = sequelize.define('AccountSyncEndpoint', {
        id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.INTEGER,
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
        endpoint: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        last_ts: {
            allowNull: false,
            type: DataTypes.BIGINT,
        },
        last_timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
        },
        pending_ts_start: {
            allowNull: true,
            type: DataTypes.BIGINT,
        },
        pending_ts_end: {
            allowNull: true,
            type: DataTypes.BIGINT,
        }
    }, {
        tableName: 'account_sync_endpoints'
    });
 
    AccountSyncEndpoint.associate = function(models) {
        models.AccountSyncEndpoint.Account = models.AccountSyncEndpoint.belongsTo(models.Account, {
            as: 'account',
            foreignKey: 'account_id'
        });
    }

    return AccountSyncEndpoint;
}