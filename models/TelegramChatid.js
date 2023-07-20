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

    var TelegramChatid = sequelize.define('TelegramChatid', {
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
        chat_id: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true
        },
        description: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        is_valid: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        level: {
            allowNull: false,
            type: DataTypes.SMALLINT,
        },
        scope: {
            allowNull: true,
            type: DataTypes.ENUM('strategy', 'other', 'strategy-other'),
        }


    }, {
        tableName: 'telegram_chatids'
    });
 
    return TelegramChatid;
}