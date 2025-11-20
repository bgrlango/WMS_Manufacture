const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransferQc = sequelize.define('TransferQc', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    part_number: { type: DataTypes.STRING(100), allowNull: false },
    lot_number: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    transfer_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    production_order_id: { type: DataTypes.INTEGER },
    user_id: { type: DataTypes.INTEGER },
    notes: { type: DataTypes.TEXT }
}, { tableName: 'transfer_qc', timestamps: false });

module.exports = TransferQc;
