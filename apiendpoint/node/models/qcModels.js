const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * QC Inspection Plans Model
 * Master data for QC procedures and inspection requirements
 */
const QCInspectionPlan = sequelize.define('QCInspectionPlan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    plan_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'QC Plan reference code'
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    plan_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    inspection_type: {
        type: DataTypes.ENUM('incoming', 'in_process', 'final', 'customer_return'),
        allowNull: false
    },
    sampling_method: {
        type: DataTypes.ENUM('100_percent', 'statistical', 'mil_std', 'custom'),
        defaultValue: 'statistical'
    },
    sample_size: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    acceptance_criteria: {
        type: DataTypes.JSON,
        comment: 'Criteria for pass/fail decisions'
    },
    inspection_points: {
        type: DataTypes.JSON,
        comment: 'List of measurement points and tolerances'
    },
    required_tools: {
        type: DataTypes.STRING(500),
        comment: 'Required inspection tools/equipment'
    },
    estimated_time_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'qc_inspection_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'QC inspection plans and procedures'
});

/**
 * QC Inspection Results Model
 * Detailed inspection records and results
 */
const QCInspectionResult = sequelize.define('QCInspectionResult', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    inspection_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'QC inspection reference'
    },
    qc_plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'qc_inspection_plans',
            key: 'id'
        }
    },
    source_type: {
        type: DataTypes.ENUM('production', 'receiving', 'return', 'audit'),
        allowNull: false
    },
    source_reference_id: {
        type: DataTypes.INTEGER,
        comment: 'Reference to production order, delivery, etc'
    },
    lot_number: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    quantity_inspected: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false
    },
    quantity_passed: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.00
    },
    quantity_failed: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.00
    },
    quantity_rework: {
        type: DataTypes.DECIMAL(12, 3),
        defaultValue: 0.00
    },
    inspection_status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'on_hold'),
        defaultValue: 'pending'
    },
    overall_result: {
        type: DataTypes.ENUM('pass', 'fail', 'conditional_pass', 'pending'),
        defaultValue: 'pending'
    },
    inspector_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    inspection_start_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    inspection_end_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    inspection_location: {
        type: DataTypes.STRING(100),
        comment: 'Where inspection was performed'
    },
    measurement_data: {
        type: DataTypes.JSON,
        comment: 'Detailed measurement results'
    },
    defect_codes: {
        type: DataTypes.JSON,
        comment: 'List of defect codes found'
    },
    corrective_actions: {
        type: DataTypes.TEXT,
        comment: 'Required corrective actions'
    },
    inspector_notes: {
        type: DataTypes.TEXT,
        comment: 'Inspector comments and observations'
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'QC supervisor approval'
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    approval_notes: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'qc_inspection_results',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Detailed QC inspection results'
});

/**
 * QC Defect Codes Model
 * Master data for defect classification
 */
const QCDefectCode = sequelize.define('QCDefectCode', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    defect_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    defect_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    defect_category: {
        type: DataTypes.ENUM('dimensional', 'visual', 'functional', 'material', 'assembly', 'packaging'),
        allowNull: false
    },
    severity_level: {
        type: DataTypes.ENUM('critical', 'major', 'minor', 'observation'),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    corrective_action_template: {
        type: DataTypes.TEXT,
        comment: 'Standard corrective action'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'qc_defect_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    comment: 'Master defect codes for QC classification'
});

/**
 * QC Non-Conformance Model
 * Non-conformance reports for quality issues
 */
const QCNonConformance = sequelize.define('QCNonConformance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ncr_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'NCR reference number'
    },
    inspection_result_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'qc_inspection_results',
            key: 'id'
        }
    },
    ncr_type: {
        type: DataTypes.ENUM('supplier', 'internal', 'customer'),
        allowNull: false
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    lot_number: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    quantity_affected: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false
    },
    problem_description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    root_cause_analysis: {
        type: DataTypes.TEXT
    },
    immediate_action: {
        type: DataTypes.TEXT,
        comment: 'Immediate containment action'
    },
    corrective_action: {
        type: DataTypes.TEXT,
        comment: 'Long-term corrective action'
    },
    preventive_action: {
        type: DataTypes.TEXT,
        comment: 'Preventive measures'
    },
    ncr_status: {
        type: DataTypes.ENUM('open', 'investigating', 'action_required', 'verification', 'closed'),
        defaultValue: 'open'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
    },
    reported_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Responsible person for resolution'
    },
    verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'QC verification'
    },
    target_close_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    actual_close_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    cost_impact: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        comment: 'Financial impact'
    }
}, {
    tableName: 'qc_non_conformance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Non-conformance reports for quality issues'
});

/**
 * Enhanced OQC Model
 * Updated Outgoing Quality Control model
 */
const OQC = sequelize.define('OQC', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    inspection_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'OQC reference number'
    },
    part_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'master_prod',
            key: 'part_number'
        }
    },
    lot_number: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    production_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'production_orders',
            key: 'id'
        },
        comment: 'Source production order'
    },
    quantity_received: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        comment: 'Total quantity received for inspection'
    },
    quantity_inspected: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        comment: 'Quantity actually inspected'
    },
    quantity_good: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.00
    },
    quantity_ng: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.00
    },
    quantity_rework: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0.00
    },
    inspection_type: {
        type: DataTypes.ENUM('first_piece', 'in_process', 'final', 'random'),
        defaultValue: 'final'
    },
    inspection_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    inspector_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    inspection_location: {
        type: DataTypes.STRING(100),
        defaultValue: 'OQC-AREA'
    },
    overall_result: {
        type: DataTypes.ENUM('pass', 'fail', 'conditional_pass', 'pending'),
        defaultValue: 'pending'
    },
    inspection_status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'on_hold'),
        defaultValue: 'pending'
    },
    measurement_data: {
        type: DataTypes.JSON,
        comment: 'Inspection measurements and results'
    },
    defect_details: {
        type: DataTypes.JSON,
        comment: 'Details of any defects found'
    },
    inspector_notes: {
        type: DataTypes.TEXT
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    approval_notes: {
        type: DataTypes.TEXT
    },
    disposition: {
        type: DataTypes.ENUM('release', 'hold', 'rework', 'scrap', 'return_to_supplier'),
        allowNull: true
    },
    disposition_notes: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'oqc',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Enhanced Outgoing Quality Control inspections'
});

// Define associations
QCInspectionPlan.associate = function(models) {
    QCInspectionPlan.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    QCInspectionPlan.hasMany(QCInspectionResult, { foreignKey: 'qc_plan_id', as: 'inspection_results' });
};

QCInspectionResult.associate = function(models) {
    QCInspectionResult.belongsTo(QCInspectionPlan, { foreignKey: 'qc_plan_id', as: 'inspection_plan' });
    QCInspectionResult.belongsTo(models.User, { foreignKey: 'inspector_id', as: 'inspector' });
    QCInspectionResult.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
    QCInspectionResult.hasMany(QCNonConformance, { foreignKey: 'inspection_result_id', as: 'non_conformances' });
};

QCNonConformance.associate = function(models) {
    QCNonConformance.belongsTo(QCInspectionResult, { foreignKey: 'inspection_result_id', as: 'inspection_result' });
    QCNonConformance.belongsTo(models.User, { foreignKey: 'reported_by', as: 'reporter' });
    QCNonConformance.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' });
    QCNonConformance.belongsTo(models.User, { foreignKey: 'verified_by', as: 'verifier' });
};

OQC.associate = function(models) {
    OQC.belongsTo(models.User, { foreignKey: 'inspector_id', as: 'inspector' });
    OQC.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approver' });
    OQC.belongsTo(models.ProductionOrder, { foreignKey: 'production_order_id', as: 'production_order' });
};

module.exports = {
    QCInspectionPlan,
    QCInspectionResult,
    QCDefectCode,
    QCNonConformance,
    OQC
};
