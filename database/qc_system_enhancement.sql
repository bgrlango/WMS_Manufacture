-- ====================================================================
-- QUALITY CONTROL (QC) SYSTEM ENHANCEMENT
-- Complete QC workflow for ERP Manufacturing System
-- Date: 2025-08-28
-- ====================================================================

USE cloudtle;

-- ====================================================================
-- QUALITY CONTROL TABLES
-- ====================================================================

-- QC Inspection Plans (Master data for QC procedures)
CREATE TABLE IF NOT EXISTS qc_inspection_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'QC Plan reference code',
    part_number VARCHAR(100) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    inspection_type ENUM('incoming', 'in_process', 'final', 'customer_return') NOT NULL,
    sampling_method ENUM('100_percent', 'statistical', 'mil_std', 'custom') DEFAULT 'statistical',
    sample_size INT DEFAULT 1,
    acceptance_criteria JSON COMMENT 'Criteria for pass/fail decisions',
    inspection_points JSON COMMENT 'List of measurement points and tolerances',
    required_tools VARCHAR(500) COMMENT 'Required inspection tools/equipment',
    estimated_time_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (part_number) REFERENCES master_prod(part_number) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_qc_part_type (part_number, inspection_type),
    INDEX idx_qc_active (is_active)
) ENGINE=InnoDB COMMENT='QC inspection plans and procedures';

-- QC Inspection Results (Detailed inspection records)
CREATE TABLE IF NOT EXISTS qc_inspection_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'QC inspection reference',
    qc_plan_id INT NOT NULL,
    source_type ENUM('production', 'receiving', 'return', 'audit') NOT NULL,
    source_reference_id INT COMMENT 'Reference to production order, delivery, etc',
    lot_number VARCHAR(255) NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    quantity_inspected DECIMAL(12,3) NOT NULL,
    quantity_passed DECIMAL(12,3) DEFAULT 0.00,
    quantity_failed DECIMAL(12,3) DEFAULT 0.00,
    quantity_rework DECIMAL(12,3) DEFAULT 0.00,
    
    inspection_status ENUM('pending', 'in_progress', 'completed', 'on_hold') DEFAULT 'pending',
    overall_result ENUM('pass', 'fail', 'conditional_pass', 'pending') DEFAULT 'pending',
    
    inspector_id INT NOT NULL,
    inspection_start_time TIMESTAMP NULL,
    inspection_end_time TIMESTAMP NULL,
    inspection_location VARCHAR(100) COMMENT 'Where inspection was performed',
    
    measurement_data JSON COMMENT 'Detailed measurement results',
    defect_codes JSON COMMENT 'List of defect codes found',
    corrective_actions TEXT COMMENT 'Required corrective actions',
    inspector_notes TEXT COMMENT 'Inspector comments and observations',
    
    approved_by INT NULL COMMENT 'QC supervisor approval',
    approved_at TIMESTAMP NULL,
    approval_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (qc_plan_id) REFERENCES qc_inspection_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (part_number) REFERENCES master_prod(part_number) ON DELETE RESTRICT,
    FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_qc_inspection_status (inspection_status),
    INDEX idx_qc_result (overall_result),
    INDEX idx_qc_date (inspection_start_time),
    INDEX idx_qc_lot (lot_number),
    INDEX idx_qc_source (source_type, source_reference_id)
) ENGINE=InnoDB COMMENT='Detailed QC inspection results';

-- QC Defect Codes (Master data for defect classification)
CREATE TABLE IF NOT EXISTS qc_defect_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    defect_code VARCHAR(20) UNIQUE NOT NULL,
    defect_name VARCHAR(255) NOT NULL,
    defect_category ENUM('dimensional', 'visual', 'functional', 'material', 'assembly', 'packaging') NOT NULL,
    severity_level ENUM('critical', 'major', 'minor', 'observation') NOT NULL,
    description TEXT,
    corrective_action_template TEXT COMMENT 'Standard corrective action',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_defect_category (defect_category),
    INDEX idx_defect_severity (severity_level)
) ENGINE=InnoDB COMMENT='Master defect codes for QC classification';

-- QC Non-Conformance Reports (NCR)
CREATE TABLE IF NOT EXISTS qc_non_conformance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ncr_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'NCR reference number',
    inspection_result_id INT NOT NULL,
    ncr_type ENUM('supplier', 'internal', 'customer') NOT NULL,
    
    part_number VARCHAR(100) NOT NULL,
    lot_number VARCHAR(255) NOT NULL,
    quantity_affected DECIMAL(12,3) NOT NULL,
    
    problem_description TEXT NOT NULL,
    root_cause_analysis TEXT,
    immediate_action TEXT COMMENT 'Immediate containment action',
    corrective_action TEXT COMMENT 'Long-term corrective action',
    preventive_action TEXT COMMENT 'Preventive measures',
    
    ncr_status ENUM('open', 'investigating', 'action_required', 'verification', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    reported_by INT NOT NULL,
    assigned_to INT NULL COMMENT 'Responsible person for resolution',
    verified_by INT NULL COMMENT 'QC verification',
    
    target_close_date DATE NULL,
    actual_close_date DATE NULL,
    
    cost_impact DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Financial impact',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (inspection_result_id) REFERENCES qc_inspection_results(id) ON DELETE RESTRICT,
    FOREIGN KEY (part_number) REFERENCES master_prod(part_number) ON DELETE RESTRICT,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_ncr_status (ncr_status),
    INDEX idx_ncr_priority (priority),
    INDEX idx_ncr_dates (target_close_date, actual_close_date)
) ENGINE=InnoDB COMMENT='Non-conformance reports for quality issues';

-- QC Calibration Records (Equipment calibration tracking)
CREATE TABLE IF NOT EXISTS qc_calibration_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id VARCHAR(50) NOT NULL COMMENT 'Equipment/tool identifier',
    equipment_name VARCHAR(255) NOT NULL,
    calibration_type ENUM('internal', 'external', 'verification') NOT NULL,
    
    calibration_date DATE NOT NULL,
    next_calibration_date DATE NOT NULL,
    calibration_interval_months INT DEFAULT 12,
    
    calibrated_by VARCHAR(255) NOT NULL COMMENT 'Calibration performed by',
    calibration_certificate VARCHAR(100) COMMENT 'Certificate reference',
    
    pre_calibration_status ENUM('pass', 'fail', 'out_of_tolerance') NOT NULL,
    post_calibration_status ENUM('pass', 'fail', 'out_of_tolerance') NOT NULL,
    
    accuracy_specification VARCHAR(255) COMMENT 'Required accuracy specification',
    actual_accuracy VARCHAR(255) COMMENT 'Measured accuracy',
    
    calibration_results JSON COMMENT 'Detailed calibration measurements',
    notes TEXT,
    
    status ENUM('current', 'due', 'overdue', 'retired') DEFAULT 'current',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_calibration_equipment (equipment_id),
    INDEX idx_calibration_dates (next_calibration_date),
    INDEX idx_calibration_status (status)
) ENGINE=InnoDB COMMENT='QC equipment calibration tracking';

-- ====================================================================
-- ENHANCED OQC TABLE (Update existing structure)
-- ====================================================================

-- Drop and recreate OQC table with enhanced structure
DROP TABLE IF EXISTS oqc;

CREATE TABLE oqc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'OQC reference number',
    part_number VARCHAR(100) NOT NULL,
    lot_number VARCHAR(255) NOT NULL,
    production_order_id INT NULL COMMENT 'Source production order',
    
    -- Quantity tracking
    quantity_received DECIMAL(12,3) NOT NULL COMMENT 'Total quantity received for inspection',
    quantity_inspected DECIMAL(12,3) NOT NULL COMMENT 'Quantity actually inspected',
    quantity_good DECIMAL(12,3) NOT NULL DEFAULT 0.00,
    quantity_ng DECIMAL(12,3) NOT NULL DEFAULT 0.00,
    quantity_rework DECIMAL(12,3) NOT NULL DEFAULT 0.00,
    
    -- Inspection details
    inspection_type ENUM('first_piece', 'in_process', 'final', 'random') DEFAULT 'final',
    inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    inspector_id INT NOT NULL,
    inspection_location VARCHAR(100) DEFAULT 'OQC-AREA',
    
    -- Results and status
    overall_result ENUM('pass', 'fail', 'conditional_pass', 'pending') DEFAULT 'pending',
    inspection_status ENUM('pending', 'in_progress', 'completed', 'on_hold') DEFAULT 'pending',
    
    -- Documentation
    measurement_data JSON COMMENT 'Inspection measurements and results',
    defect_details JSON COMMENT 'Details of any defects found',
    inspector_notes TEXT,
    
    -- Approval workflow
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    approval_notes TEXT,
    
    -- Disposition
    disposition ENUM('release', 'hold', 'rework', 'scrap', 'return_to_supplier') NULL,
    disposition_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (part_number) REFERENCES master_prod(part_number) ON DELETE RESTRICT,
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_oqc_lot (lot_number),
    INDEX idx_oqc_date (inspection_date),
    INDEX idx_oqc_status (inspection_status),
    INDEX idx_oqc_result (overall_result),
    INDEX idx_oqc_disposition (disposition)
) ENGINE=InnoDB COMMENT='Enhanced Outgoing Quality Control inspections';

-- ====================================================================
-- INSERT MASTER DATA
-- ====================================================================

-- QC Defect Codes
INSERT INTO qc_defect_codes (defect_code, defect_name, defect_category, severity_level, description) VALUES
('DIM001', 'Dimension Out of Tolerance', 'dimensional', 'major', 'Critical dimensions outside specified tolerance'),
('DIM002', 'Surface Roughness', 'dimensional', 'minor', 'Surface finish not meeting requirements'),
('VIS001', 'Scratch/Dent', 'visual', 'minor', 'Surface scratches or dents'),
('VIS002', 'Color Variation', 'visual', 'minor', 'Color not matching specification'),
('VIS003', 'Missing Components', 'visual', 'critical', 'Required components missing'),
('FUN001', 'Functional Failure', 'functional', 'critical', 'Product does not perform as specified'),
('FUN002', 'Performance Degradation', 'functional', 'major', 'Performance below specification'),
('MAT001', 'Material Defect', 'material', 'major', 'Raw material does not meet specification'),
('ASM001', 'Assembly Error', 'assembly', 'major', 'Incorrect assembly or fit'),
('PAK001', 'Packaging Damage', 'packaging', 'minor', 'Damaged packaging');

-- System Configuration for QC
INSERT INTO system_configuration (config_key, config_value, config_type, description, category) VALUES
('qc_inspection_prefix', 'INS-', 'string', 'Prefix for inspection numbers', 'quality'),
('qc_ncr_prefix', 'NCR-', 'string', 'Prefix for NCR numbers', 'quality'),
('qc_default_sample_size', '5', 'number', 'Default sample size for inspections', 'quality'),
('qc_auto_approve_threshold', '95', 'number', 'Auto-approve threshold percentage', 'quality'),
('qc_calibration_reminder_days', '30', 'number', 'Days before calibration due for reminder', 'quality');

-- ====================================================================
-- CREATE VIEWS FOR QC REPORTING
-- ====================================================================

-- QC Summary View
CREATE OR REPLACE VIEW v_qc_summary AS
SELECT 
    DATE(inspection_date) as inspection_date,
    part_number,
    COUNT(*) as total_inspections,
    SUM(quantity_inspected) as total_quantity_inspected,
    SUM(quantity_good) as total_quantity_passed,
    SUM(quantity_ng) as total_quantity_failed,
    ROUND((SUM(quantity_good) / SUM(quantity_inspected)) * 100, 2) as pass_rate_percentage,
    COUNT(CASE WHEN overall_result = 'pass' THEN 1 END) as passed_lots,
    COUNT(CASE WHEN overall_result = 'fail' THEN 1 END) as failed_lots
FROM oqc 
WHERE inspection_status = 'completed'
GROUP BY DATE(inspection_date), part_number;

-- Active NCR View
CREATE OR REPLACE VIEW v_active_ncr AS
SELECT 
    ncr.ncr_number,
    ncr.part_number,
    ncr.ncr_type,
    ncr.priority,
    ncr.ncr_status,
    ncr.quantity_affected,
    ncr.problem_description,
    ncr.target_close_date,
    DATEDIFF(CURDATE(), ncr.target_close_date) as days_overdue,
    reporter.full_name as reported_by_name,
    assignee.full_name as assigned_to_name,
    ncr.created_at
FROM qc_non_conformance ncr
LEFT JOIN users reporter ON ncr.reported_by = reporter.id
LEFT JOIN users assignee ON ncr.assigned_to = assignee.id
WHERE ncr.ncr_status != 'closed'
ORDER BY ncr.priority DESC, ncr.target_close_date ASC;

-- Calibration Due View
CREATE OR REPLACE VIEW v_calibration_due AS
SELECT 
    equipment_id,
    equipment_name,
    calibration_date,
    next_calibration_date,
    DATEDIFF(next_calibration_date, CURDATE()) as days_until_due,
    status,
    CASE 
        WHEN DATEDIFF(next_calibration_date, CURDATE()) < 0 THEN 'OVERDUE'
        WHEN DATEDIFF(next_calibration_date, CURDATE()) <= 30 THEN 'DUE_SOON'
        ELSE 'CURRENT'
    END as calibration_status
FROM qc_calibration_records
WHERE status IN ('current', 'due', 'overdue')
ORDER BY next_calibration_date ASC;
