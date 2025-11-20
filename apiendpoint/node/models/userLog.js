const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserLog = sequelize.define('UserLog', {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true
    },
    user_id: {  // Database uses user_id, not id_user
        type: DataTypes.INTEGER, 
        allowNull: false,
        references: { 
            model: 'users', 
            key: 'id' 
        }
    },
    action: {  // Database field name
        type: DataTypes.STRING(100), 
        allowNull: false 
    },
    table_name: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    record_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: { 
        type: DataTypes.DATE, 
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, { 
    tableName: 'user_log', 
    timestamps: false,  // Manual created_at only
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['created_at']
        }
    ]
});

module.exports = UserLog;
