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

    var ExchangeMarket = sequelize.define('ExchangeMarket', {
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
        markets: {
            allowNull: true,
            type: DataTypes.JSONB,
        },
        markets_updated_at: {
            allowNull: true,
            type: DataTypes.DATE
        },
        paper: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'exchange_markets'
    });
 
    ExchangeMarket.Exchange = ExchangeMarket.belongsTo(Exchange, {
        as: 'exchange',
        foreignKey: 'exchange_id'
    });

    ExchangeMarket.AccountType = ExchangeMarket.belongsTo(AccountType, {
        as: 'account_type',
        foreignKey: 'account_type_id'
    });

    return ExchangeMarket;
}