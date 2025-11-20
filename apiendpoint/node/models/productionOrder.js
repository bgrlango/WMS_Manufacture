const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductionOrder = sequelize.define('ProductionOrder', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    job_order: { 
        type: DataTypes.STRING(100), 
        allowNull: false, 
        unique: true 
    },
    part_number: { type: DataTypes.STRING(100), allowNull: false },
    quantity_to_produce: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    initial_wip_stock: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('running', 'rework', 'pending', 'cancelled'), defaultValue: 'running' },
    created_by_id: { type: DataTypes.INTEGER },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    completion_date: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'production_orders', timestamps: false });

module.exports = ProductionOrder;
