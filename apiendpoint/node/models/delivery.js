const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('Delivery', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    delivery_order_number: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    part_number: { type: DataTypes.STRING(100), allowNull: false },
    quantity_shipped: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    delivery_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    user_id: { type: DataTypes.INTEGER },
    customer: { type: DataTypes.STRING(255) },
    notes: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE }
}, { tableName: 'delivery', timestamps: false });

module.exports = Delivery;
