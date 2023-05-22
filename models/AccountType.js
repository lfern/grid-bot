'use strict';

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    var AccountType = sequelize.define('AccountType', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        account_type: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        account_type_name: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    }, {
        tableName: 'account_types'
    });

    return AccountType;
}