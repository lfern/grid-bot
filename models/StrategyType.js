'use strict';

/** @typedef {import('sequelize').Sequelize} Sequelize */
/** @typedef {import('sequelize').DataTypes} DataTypes */

/**
 * 
 * @param {Sequelize} sequelize 
 * @param {DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {
    var StrategyType = sequelize.define('StrategyType', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        strategy_type: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        strategy_type_name: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    }, {
        tableName: 'strategy_types'
    });

    return StrategyType;
}