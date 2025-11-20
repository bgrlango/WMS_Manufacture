const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OutputMc = sequelize.define('OutputMc', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    production_order_id: { type: DataTypes.INTEGER },
    machine_id: { type: DataTypes.STRING(50), allowNull: false },
    part_number: { type: DataTypes.STRING(100), allowNull: false },
    quantity_good: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantity_ng: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    operator_id: { type: DataTypes.INTEGER },
    shift: { type: DataTypes.ENUM('1', '2', '3'), allowNull: false },
    production_date: { type: DataTypes.DATEONLY, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'output_mc', timestamps: false });

module.exports = OutputMc;
