const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OQC = sequelize.define('OQC', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    part_number: { type: DataTypes.STRING(100), allowNull: false },
    lot_number: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    quantity_good: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    quantity_ng: { type: DataTypes.DECIMAL(10, 0) },
    inspection_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    inspector_id: { type: DataTypes.INTEGER },
    notes: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE }
}, { tableName: 'oqc', timestamps: false });

module.exports = OQC;
