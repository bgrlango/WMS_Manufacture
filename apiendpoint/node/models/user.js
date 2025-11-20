const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    full_name: { 
        type: DataTypes.STRING(100), 
        allowNull: false  // Database NOT NULL
    },
    email: { 
        type: DataTypes.STRING(100),  // Database varchar(100)
        allowNull: false, 
        unique: true 
    },
    password: { 
        type: DataTypes.STRING(255), 
        allowNull: false 
    },
    role: { 
        type: DataTypes.ENUM('production', 'quality', 'warehouse', 'admin'),  // Include admin
        allowNull: false,
        defaultValue: 'production'
    },
    department: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, { 
    tableName: 'users', 
    timestamps: true,  // Enable timestamps
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;
