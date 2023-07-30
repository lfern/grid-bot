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

    var AccountLedger = sequelize.define('AccountLedger', {
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
        exchange_txid: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        order_id: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        related_id: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        symbol: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        asset: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        tx_ts: {
            allowNull: false,
            type: DataTypes.BIGINT,
        },
        tx_timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
        },
        tx_datetime: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        tx_type: {
            allowNull: false,
            type: DataTypes.ENUM(
                'Trade', 'TradingFee', 'FundingFee', 'WithdrawalFee',
                'DepositFee', 'OtherFee', 'Deposit', 'Withdrawal',
                'Transfer', 'Settlement', 'OtherCredit', 'OtherDebit'
            ),
        }, 
        tx_subtype: {
            allowNull: true,
            type: DataTypes.ENUM(
                'WalletTransfer', 'SubaccountTransfer', 'CanceledWithdrawal' 
            ),
        },
        amount: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15),
        },
        amount_change: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15),
        },
        balance: {
            allowNull: true,
            type: DataTypes.DECIMAL(30, 15),
        },
        description: {
            allowNull: true,
            type: DataTypes.STRING
        },
        status: {
            allowNull: true,
            type: DataTypes.ENUM(
                'ok', 'canceled', 'pending' 
            ),
        },
        other_data: {
            allowNull: true,
            type: DataTypes.JSONB,
        }
    }, {
        tableName: 'account_ledgers'
    });
 
    AccountLedger.associate = function(models) {
        models.AccountLedger.Account = models.AccountLedger.belongsTo(models.Account, {
            as: 'account',
            foreignKey: 'account_id'
        });
    }

    return AccountLedger;
}