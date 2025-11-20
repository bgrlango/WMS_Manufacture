// ====================================================================
// ERP SYSTEM - ADDITIONAL SEQUELIZE MODELS
// File: backend/node/models/erpModels.js
// Purpose: Additional models untuk melengkapi ERP system
// Date: 2025-08-27
// ====================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ====================================================================
// INVENTORY & LOCATION MODELS
// ====================================================================

const InventoryLocation = sequelize.define('InventoryLocation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    location_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Location code (WH-A01, QC-01, etc)'
    },
    location_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Human readable location name'
    },
    location_type: {
        type: DataTypes.ENUM('raw_material', 'wip', 'finished_goods', 'quarantine', 'staging'),
        allowNull: false
    },
    warehouse_zone: {
        type: DataTypes.STRING(50),
        comment: 'Zone within warehouse'
    },
    capacity: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Maximum capacity'
    },
    current_utilization: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        comment: 'Current stock level'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'inventory_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['location_type'] },
        { fields: ['is_active'] }
    ]
});

const InventoryMovement = sequelize.define('InventoryMovement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    movement_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Movement reference number'
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    movement_type: {
        type: DataTypes.ENUM('in', 'out', 'transfer', 'adjustment', 'scrap'),
        allowNull: false
    },
    from_location_id: {
        type: DataTypes.INTEGER,
        comment: 'Source location'
    },
    to_location_id: {
        type: DataTypes.INTEGER,
        comment: 'Destination location'
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        comment: 'Unit cost at time of movement'
    },
    reference_type: {
        type: DataTypes.ENUM('production', 'delivery', 'receipt', 'adjustment', 'transfer', 'scrap'),
        allowNull: false
    },
    reference_id: {
        type: DataTypes.INTEGER,
        comment: 'Reference to source document'
    },
    reason_code: {
        type: DataTypes.STRING(50),
        comment: 'Reason for movement'
    },
    notes: {
        type: DataTypes.TEXT,
        comment: 'Additional notes'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    movement_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'inventory_movements',
    timestamps: false,
    indexes: [
        { fields: ['movement_date'] },
        { fields: ['movement_type'] },
        { fields: ['reference_type', 'reference_id'] }
    ]
});

const InventoryBalance = sequelize.define('InventoryBalance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    available_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.00,
        comment: 'Available for use'
    },
    reserved_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.00,
        comment: 'Reserved for orders'
    },
    quarantine_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.00,
        comment: 'In quarantine'
    },
    average_cost: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        comment: 'Weighted average cost'
    },
    last_movement_date: {
        type: DataTypes.DATE
    },
    last_count_date: {
        type: DataTypes.DATE,
        comment: 'Last physical count'
    }
}, {
    tableName: 'inventory_balances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { 
            fields: ['part_number', 'location_id'],
            unique: true,
            name: 'unique_part_location'
        },
        { fields: ['available_quantity'] }
    ]
});

// ====================================================================
// PRODUCTION PLANNING MODELS
// ====================================================================

const Machine = sequelize.define('Machine', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    machine_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    machine_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    machine_type: {
        type: DataTypes.STRING(50),
        comment: 'CNC, Press, Assembly, etc'
    },
    location_id: {
        type: DataTypes.INTEGER,
        comment: 'Physical location'
    },
    capacity_per_hour: {
        type: DataTypes.DECIMAL(8, 2),
        comment: 'Standard capacity per hour'
    },
    status: {
        type: DataTypes.ENUM('active', 'maintenance', 'breakdown', 'idle'),
        defaultValue: 'active'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'machines',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['status'] },
        { fields: ['machine_type'] }
    ]
});

const ProductionSchedule = sequelize.define('ProductionSchedule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    schedule_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    production_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    machine_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    operator_id: {
        type: DataTypes.INTEGER,
        comment: 'Assigned operator'
    },
    scheduled_start: {
        type: DataTypes.DATE,
        allowNull: false
    },
    scheduled_end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    actual_start: {
        type: DataTypes.DATE
    },
    actual_end: {
        type: DataTypes.DATE
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'),
        defaultValue: 'scheduled'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        comment: '1=Highest, 10=Lowest'
    },
    setup_time_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    estimated_runtime_minutes: {
        type: DataTypes.INTEGER
    },
    actual_runtime_minutes: {
        type: DataTypes.INTEGER
    },
    notes: {
        type: DataTypes.TEXT
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'production_schedules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['scheduled_start', 'scheduled_end'] },
        { fields: ['status'] },
        { fields: ['machine_id', 'scheduled_start'] }
    ]
});

const BillOfMaterials = sequelize.define('BillOfMaterials', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    parent_part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Finished product'
    },
    child_part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Component/material'
    },
    quantity_required: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        comment: 'Quantity needed per parent unit'
    },
    unit_of_measure: {
        type: DataTypes.STRING(20),
        defaultValue: 'PCS'
    },
    scrap_factor: {
        type: DataTypes.DECIMAL(5, 4),
        defaultValue: 0.0000,
        comment: 'Expected scrap percentage'
    },
    operation_sequence: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'When this component is used'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    expiry_date: {
        type: DataTypes.DATEONLY
    }
}, {
    tableName: 'bill_of_materials',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { 
            fields: ['parent_part_number', 'child_part_number', 'effective_date'],
            unique: true,
            name: 'unique_bom_component'
        },
        { fields: ['parent_part_number'] },
        { fields: ['child_part_number'] },
        { fields: ['is_active', 'effective_date', 'expiry_date'] }
    ]
});

// ====================================================================
// PROCUREMENT MODELS
// ====================================================================

const Supplier = sequelize.define('Supplier', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    supplier_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    supplier_name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    contact_person: {
        type: DataTypes.STRING(100)
    },
    email: {
        type: DataTypes.STRING(100)
    },
    phone: {
        type: DataTypes.STRING(50)
    },
    address: {
        type: DataTypes.TEXT
    },
    city: {
        type: DataTypes.STRING(100)
    },
    country: {
        type: DataTypes.STRING(100),
        defaultValue: 'Indonesia'
    },
    tax_number: {
        type: DataTypes.STRING(50)
    },
    payment_terms: {
        type: DataTypes.STRING(100),
        comment: 'NET 30, COD, etc'
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'IDR'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        comment: 'Supplier rating 1-5'
    }
}, {
    tableName: 'suppliers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['supplier_name'] },
        { fields: ['is_active'] }
    ]
});

const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    po_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    po_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    expected_delivery_date: {
        type: DataTypes.DATEONLY
    },
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'acknowledged', 'partial_received', 'completed', 'cancelled'),
        defaultValue: 'draft'
    },
    total_amount: {
        type: DataTypes.DECIMAL(15, 2)
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'IDR'
    },
    payment_terms: {
        type: DataTypes.STRING(100)
    },
    delivery_address: {
        type: DataTypes.TEXT
    },
    notes: {
        type: DataTypes.TEXT
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    approved_by: {
        type: DataTypes.INTEGER
    },
    approved_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'purchase_orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['po_date'] },
        { fields: ['status'] },
        { fields: ['supplier_id', 'po_date'] }
    ]
});

// ====================================================================
// SYSTEM MANAGEMENT MODELS
// ====================================================================

const IntegrationQueue = sequelize.define('IntegrationQueue', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    queue_number: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    system_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Target system: WMS, ERP, QC, etc'
    },
    action_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'create, update, delete, sync'
    },
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'production_order, delivery, etc'
    },
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    payload: {
        type: DataTypes.JSON,
        comment: 'Data to be sent'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'retry'),
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    },
    retry_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    max_retries: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    error_message: {
        type: DataTypes.TEXT
    },
    response_data: {
        type: DataTypes.JSON
    },
    processed_at: {
        type: DataTypes.DATE
    },
    next_retry_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'integration_queue',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { fields: ['status'] },
        { fields: ['system_name', 'status'] },
        { fields: ['next_retry_at'] }
    ]
});

const WorkflowState = sequelize.define('WorkflowState', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'production_order, delivery, etc'
    },
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    workflow_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'production_workflow, delivery_workflow'
    },
    current_state: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    previous_state: {
        type: DataTypes.STRING(50)
    },
    next_possible_states: {
        type: DataTypes.JSON,
        comment: 'Array of possible next states'
    },
    state_data: {
        type: DataTypes.JSON,
        comment: 'Additional state-specific data'
    },
    changed_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    changed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    notes: {
        type: DataTypes.TEXT
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'workflow_states',
    timestamps: false,
    indexes: [
        { 
            fields: ['entity_type', 'entity_id', 'workflow_name', 'is_active'],
            unique: true,
            name: 'unique_entity_workflow'
        },
        { fields: ['workflow_name', 'current_state'] },
        { fields: ['entity_type', 'entity_id'] }
    ]
});

const SystemConfiguration = sequelize.define('SystemConfiguration', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    config_key: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    config_value: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    config_type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string'
    },
    description: {
        type: DataTypes.TEXT
    },
    is_editable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    category: {
        type: DataTypes.STRING(50),
        defaultValue: 'general'
    }
}, {
    tableName: 'system_configuration',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['category'] }
    ]
});

// ====================================================================
// MODEL ASSOCIATIONS
// ====================================================================

// Note: Associations will be setup in index.js after all models are loaded
// to avoid circular dependency issues

module.exports = {
    // Inventory & Location
    InventoryLocation,
    InventoryMovement,
    InventoryBalance,
    
    // Production Planning
    Machine,
    ProductionSchedule,
    BillOfMaterials,
    
    // Procurement
    Supplier,
    PurchaseOrder,
    
    // System Management
    IntegrationQueue,
    WorkflowState,
    SystemConfiguration
};
