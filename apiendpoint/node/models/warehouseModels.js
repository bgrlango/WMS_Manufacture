/**
 * Enhanced Warehouse Models - CQRS Command Operations
 * Comprehensive inventory management models
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ====================================================================
// INVENTORY BALANCES MODEL (Enhanced)
// ====================================================================
const InventoryBalance = sequelize.define('InventoryBalance', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'inventory_locations',
            key: 'id'
        }
    },
    available_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.000
    },
    reserved_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.000
    },
    quarantine_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.000
    },
    average_cost: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    last_movement_date: {
        type: DataTypes.DATE
    },
    last_count_date: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'inventory_balances',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['part_number', 'location_id'],
            unique: true
        },
        {
            fields: ['available_quantity']
        }
    ]
});

// ====================================================================
// INVENTORY MOVEMENTS MODEL (Enhanced)
// ====================================================================
const InventoryMovement = sequelize.define('InventoryMovement', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    movement_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    movement_type: {
        type: DataTypes.ENUM('in', 'out', 'transfer', 'adjustment', 'scrap'),
        allowNull: false
    },
    from_location_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'inventory_locations',
            key: 'id'
        }
    },
    to_location_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'inventory_locations',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2)
    },
    reference_type: {
        type: DataTypes.ENUM('production', 'delivery', 'receipt', 'adjustment', 'transfer', 'scrap'),
        allowNull: false
    },
    reference_id: {
        type: DataTypes.INTEGER
    },
    reason_code: {
        type: DataTypes.STRING(50)
    },
    notes: {
        type: DataTypes.TEXT
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    movement_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    batch_number: {
        type: DataTypes.STRING(100)
    },
    expiry_date: {
        type: DataTypes.DATE
    },
    serial_numbers: {
        type: DataTypes.JSON
    }
}, {
    tableName: 'inventory_movements',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['movement_type', 'movement_date']
        },
        {
            fields: ['part_number', 'movement_date']
        },
        {
            fields: ['reference_type', 'reference_id']
        }
    ]
});

// ====================================================================
// INVENTORY LOCATIONS MODEL (Enhanced)
// ====================================================================
const InventoryLocation = sequelize.define('InventoryLocation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    location_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    location_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    location_type: {
        type: DataTypes.ENUM('raw_material', 'wip', 'finished_goods', 'quarantine', 'staging'),
        allowNull: false
    },
    warehouse_zone: {
        type: DataTypes.STRING(50)
    },
    aisle: {
        type: DataTypes.STRING(10)
    },
    rack: {
        type: DataTypes.STRING(10)
    },
    shelf: {
        type: DataTypes.STRING(10)
    },
    bin: {
        type: DataTypes.STRING(10)
    },
    capacity: {
        type: DataTypes.DECIMAL(12, 2)
    },
    current_utilization: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    },
    temperature_controlled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    hazardous_materials: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'inventory_locations',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['location_type', 'is_active']
        },
        {
            fields: ['warehouse_zone']
        }
    ]
});

// ====================================================================
// STOCK RESERVATIONS MODEL (New)
// ====================================================================
const StockReservation = sequelize.define('StockReservation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    reservation_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'inventory_locations',
            key: 'id'
        }
    },
    reserved_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false
    },
    reservation_type: {
        type: DataTypes.ENUM('production_order', 'delivery_order', 'transfer_order', 'manual'),
        allowNull: false
    },
    reference_id: {
        type: DataTypes.INTEGER
    },
    reserved_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reservation_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    expiry_date: {
        type: DataTypes.DATE
    },
    status: {
        type: DataTypes.ENUM('active', 'fulfilled', 'cancelled', 'expired'),
        defaultValue: 'active'
    },
    notes: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'stock_reservations',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['part_number', 'status']
        },
        {
            fields: ['reservation_type', 'reference_id']
        }
    ]
});

// ====================================================================
// CYCLE COUNT MODEL (New)
// ====================================================================
const CycleCount = sequelize.define('CycleCount', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    count_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'inventory_locations',
            key: 'id'
        }
    },
    count_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    count_type: {
        type: DataTypes.ENUM('cycle', 'physical', 'spot', 'abc_analysis'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'planned'
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_by: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    notes: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'cycle_counts',
    timestamps: true,
    underscored: true
});

// ====================================================================
// CYCLE COUNT DETAILS MODEL (New)
// ====================================================================
const CycleCountDetail = sequelize.define('CycleCountDetail', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    cycle_count_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cycle_counts',
            key: 'id'
        }
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    system_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false
    },
    counted_quantity: {
        type: DataTypes.DECIMAL(12, 3)
    },
    variance_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0
    },
    variance_value: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    reason_code: {
        type: DataTypes.STRING(50)
    },
    notes: {
        type: DataTypes.TEXT
    },
    counted_by: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    counted_date: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'cycle_count_details',
    timestamps: true,
    underscored: true
});

// ====================================================================
// MODEL ASSOCIATIONS
// ====================================================================

// InventoryBalance associations
InventoryBalance.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });
InventoryLocation.hasMany(InventoryBalance, { foreignKey: 'location_id', as: 'balances' });

// InventoryMovement associations
InventoryMovement.belongsTo(InventoryLocation, { foreignKey: 'from_location_id', as: 'fromLocation' });
InventoryMovement.belongsTo(InventoryLocation, { foreignKey: 'to_location_id', as: 'toLocation' });

// StockReservation associations
StockReservation.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });

// CycleCount associations
CycleCount.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });
CycleCount.hasMany(CycleCountDetail, { foreignKey: 'cycle_count_id', as: 'details' });
CycleCountDetail.belongsTo(CycleCount, { foreignKey: 'cycle_count_id', as: 'cycleCount' });

module.exports = {
    InventoryBalance,
    InventoryMovement,
    InventoryLocation,
    StockReservation,
    CycleCount,
    CycleCountDetail
};
