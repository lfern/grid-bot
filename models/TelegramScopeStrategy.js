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

    var TelegramScopeStrategy = sequelize.define('TelegramScopeStrategy', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
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
        telegram_chat_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            references: {
                model: {
                    tableName: 'telegram_chatids'
                },
                key: 'id'
            }
        },
        strategy_id: {
            allowNull: false,
            type: DataTypes.UUID,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            references: {
                model: {
                    tableName: 'strategies'
                },
                key: 'id'
            }
        }
    }, {
        tableName: 'telegram_scope_strategies'
    });

    TelegramScopeStrategy.associate = function(models) {
        models.TelegramScopeStrategy.Strategy = models.TelegramScopeStrategy.belongsTo(models.Strategy, {
            as: 'strategy',
            foreignKey: 'strategy_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        models.TelegramScopeStrategy.TelegramChatId = models.TelegramScopeStrategy.belongsTo(models.TelegramChatid, {
            as: 'telegram',
            foreignKey: 'telegram_chat_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    }
 
    return TelegramScopeStrategy;
}