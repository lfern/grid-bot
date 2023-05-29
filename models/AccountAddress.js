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

    var AccountAddress = sequelize.define('AccountAddress', {
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
        address: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        confidential: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
    }, {
        tableName: 'account_addresses'
    });
 
    AccountAddress.Account = AccountAddress.belongsTo(Account, {
        as: 'account',
        foreignKey: 'account_id'
    });

    return AccountAddress;
}