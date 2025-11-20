const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Return = sequelize.define('Return', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    part_number: { type: DataTypes.STRING(100), allowNull: false },
    model: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    qty: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status_ng: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'return_customer', timestamps: false });

module.exports = Return;
