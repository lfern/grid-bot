'use strict';

const ExchangeModel = require('./Exchange');
const AccountTypeModel = require('./AccountType');

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * Account model
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    const Exchange = ExchangeModel(sequelize, DataTypes);
    const AccountType = AccountTypeModel(sequelize, DataTypes);

    var Account = sequelize.define('Account', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        exchange_id: {
            allowNull: false,
            type: DataTypes.UUID,
            references: {
                model: {
                    tableName: 'exchanges'
                },
                key: 'id'
            }
        },
        account_type_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            references: {
                model: {
                    tableName: 'account_types'
                },
                key: 'id'
            }
        },
        account_name: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true
        },
        api_key: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        api_secret: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        paper: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        enabled: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        valid: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        wallet_balance: {
            allowNull: true,
            type: DataTypes.JSONB,
        },
        wallet_balance_updated_at: {
            allowNull: true,
            type: DataTypes.DATE,
        },
        main_balance: {
            allowNull: true,
            type: DataTypes.JSONB,
        },
        main_balance_updated_at: {
            allowNull: true,
            type: DataTypes.DATE,
        },
        transfer_permission: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        holder: {
            allowNull: true,
            type: DataTypes.STRING,
        }
    }, {
        tableName: 'accounts'
    });
 
    Account.associate = function(models) {
        models.Account.Exchange = models.Account.belongsTo(models.Exchange, {
            as: 'exchange',
            foreignKey: 'exchange_id'
        });

        models.Account.AccountType = models.Account.belongsTo(models.AccountType, {
            as: 'account_type',
            foreignKey: 'account_type_id'
        });
    }

    return Account;
}