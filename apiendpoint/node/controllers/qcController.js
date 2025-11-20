/**
 * QC Controller - CQRS Command Operations
 * Handles all write operations for Quality Control
 */
const { 
    OQC, 
    TransferQc, 
    QCInspectionPlan,
    QCInspectionResult,
    QCDefectCode,
    QCNonConformance,
    User,
    ProductionOrder
} = require('../models');
const sequelize = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

// ====================================================================
// OQC OPERATIONS (Enhanced)
// ====================================================================

/**
 * Create OQC Inspection Record
 */
exports.createOqcRecord = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { 
            part_number,
            lot_number,
            production_order_id,
            quantity_received,
            quantity_inspected,
            quantity_good,
            quantity_ng,
            quantity_rework,
            inspection_type,
            inspection_location,
            measurement_data,
            defect_details,
            inspector_notes,
            disposition
        } = req.body;
        
        // Validation
        if (!part_number || !lot_number || !quantity_received || !quantity_inspected) {
            return res.status(400).json({ 
                message: 'part_number, lot_number, quantity_received, dan quantity_inspected wajib diisi.',
                status: 'error'
            });
        }
        
        // Generate inspection number
        const inspectionNumber = await generateInspectionNumber('OQC');
        
        // Create OQC record
        const newOqc = await OQC.create({
            inspection_number: inspectionNumber,
            part_number,
            lot_number,
            production_order_id,
            quantity_received,
            quantity_inspected,
            quantity_good: quantity_good || 0,
            quantity_ng: quantity_ng || 0,
            quantity_rework: quantity_rework || 0,
            inspection_type: inspection_type || 'final',
            inspection_location: inspection_location || 'OQC-AREA',
            inspector_id: req.user.id,
            measurement_data,
            defect_details,
            inspector_notes,
            disposition,
            inspection_status: 'completed',
            overall_result: quantity_ng > 0 ? 'fail' : 'pass'
        }, { transaction });
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'OQC inspection berhasil dibuat',
            data: newOqc,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating OQC record:', error);
        res.status(500).json({ 
            message: 'Gagal membuat catatan OQC',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Update OQC Record
 */
exports.updateOqcRecord = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const oqc = await OQC.findByPk(id);
        if (!oqc) {
            return res.status(404).json({ 
                message: 'OQC record tidak ditemukan',
                status: 'error'
            });
        }
        
        // Update record
        await oqc.update(updateData, { transaction });
        
        await transaction.commit();
        
        res.json({
            message: 'OQC record berhasil diupdate',
            data: oqc,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating OQC record:', error);
        res.status(500).json({ 
            message: 'Gagal mengupdate OQC record',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Approve OQC Record
 */
exports.approveOqcRecord = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { approval_notes, disposition } = req.body;
        
        const oqc = await OQC.findByPk(id);
        if (!oqc) {
            return res.status(404).json({ 
                message: 'OQC record tidak ditemukan',
                status: 'error'
            });
        }
        
        // Update approval
        await oqc.update({
            approved_by: req.user.id,
            approved_at: new Date(),
            approval_notes,
            disposition: disposition || oqc.disposition,
            inspection_status: 'completed'
        }, { transaction });
        
        await transaction.commit();
        
        res.json({
            message: 'OQC record berhasil diapprove',
            data: oqc,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error approving OQC record:', error);
        res.status(500).json({ 
            message: 'Gagal approve OQC record',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// QC INSPECTION PLAN OPERATIONS
// ====================================================================

/**
 * Create QC Inspection Plan
 */
exports.createInspectionPlan = async (req, res) => {
    try {
        const {
            plan_code,
            part_number,
            plan_name,
            inspection_type,
            sampling_method,
            sample_size,
            acceptance_criteria,
            inspection_points,
            required_tools,
            estimated_time_minutes
        } = req.body;
        
        if (!plan_code || !part_number || !plan_name || !inspection_type) {
            return res.status(400).json({
                message: 'plan_code, part_number, plan_name, dan inspection_type wajib diisi',
                status: 'error'
            });
        }
        
        const newPlan = await QCInspectionPlan.create({
            plan_code,
            part_number,
            plan_name,
            inspection_type,
            sampling_method,
            sample_size,
            acceptance_criteria,
            inspection_points,
            required_tools,
            estimated_time_minutes,
            created_by: req.user.id
        });
        
        res.status(201).json({
            message: 'QC Inspection Plan berhasil dibuat',
            data: newPlan,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error creating inspection plan:', error);
        res.status(500).json({
            message: 'Gagal membuat inspection plan',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Update QC Inspection Plan
 */
exports.updateInspectionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const plan = await QCInspectionPlan.findByPk(id);
        if (!plan) {
            return res.status(404).json({
                message: 'Inspection plan tidak ditemukan',
                status: 'error'
            });
        }
        
        await plan.update(updateData);
        
        res.json({
            message: 'Inspection plan berhasil diupdate',
            data: plan,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error updating inspection plan:', error);
        res.status(500).json({
            message: 'Gagal mengupdate inspection plan',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// QC INSPECTION RESULT OPERATIONS
// ====================================================================

/**
 * Create QC Inspection Result
 */
exports.createInspectionResult = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const {
            qc_plan_id,
            source_type,
            source_reference_id,
            lot_number,
            part_number,
            quantity_inspected,
            quantity_passed,
            quantity_failed,
            quantity_rework,
            inspection_location,
            measurement_data,
            defect_codes,
            corrective_actions,
            inspector_notes
        } = req.body;
        
        if (!qc_plan_id || !lot_number || !part_number || !quantity_inspected) {
            return res.status(400).json({
                message: 'qc_plan_id, lot_number, part_number, dan quantity_inspected wajib diisi',
                status: 'error'
            });
        }
        
        // Generate inspection number
        const inspectionNumber = await generateInspectionNumber('QCI');
        
        // Determine overall result
        const overall_result = quantity_failed > 0 ? 'fail' : 'pass';
        
        const newResult = await QCInspectionResult.create({
            inspection_number: inspectionNumber,
            qc_plan_id,
            source_type,
            source_reference_id,
            lot_number,
            part_number,
            quantity_inspected,
            quantity_passed: quantity_passed || 0,
            quantity_failed: quantity_failed || 0,
            quantity_rework: quantity_rework || 0,
            inspector_id: req.user.id,
            inspection_start_time: new Date(),
            inspection_end_time: new Date(),
            inspection_location,
            measurement_data,
            defect_codes,
            corrective_actions,
            inspector_notes,
            inspection_status: 'completed',
            overall_result
        }, { transaction });
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'QC Inspection Result berhasil dibuat',
            data: newResult,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating inspection result:', error);
        res.status(500).json({
            message: 'Gagal membuat inspection result',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// NON-CONFORMANCE REPORT OPERATIONS
// ====================================================================

/**
 * Create Non-Conformance Report
 */
exports.createNonConformance = async (req, res) => {
    try {
        const {
            inspection_result_id,
            ncr_type,
            part_number,
            lot_number,
            quantity_affected,
            problem_description,
            immediate_action,
            priority,
            assigned_to,
            target_close_date
        } = req.body;
        
        if (!inspection_result_id || !ncr_type || !part_number || !lot_number || !quantity_affected || !problem_description) {
            return res.status(400).json({
                message: 'Semua field wajib kecuali target_close_date',
                status: 'error'
            });
        }
        
        // Generate NCR number
        const ncrNumber = await generateNcrNumber();
        
        const newNcr = await QCNonConformance.create({
            ncr_number: ncrNumber,
            inspection_result_id,
            ncr_type,
            part_number,
            lot_number,
            quantity_affected,
            problem_description,
            immediate_action,
            priority: priority || 'medium',
            reported_by: req.user.id,
            assigned_to,
            target_close_date
        });
        
        res.status(201).json({
            message: 'Non-Conformance Report berhasil dibuat',
            data: newNcr,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error creating NCR:', error);
        res.status(500).json({
            message: 'Gagal membuat NCR',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Update Non-Conformance Report
 */
exports.updateNonConformance = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const ncr = await QCNonConformance.findByPk(id);
        if (!ncr) {
            return res.status(404).json({
                message: 'NCR tidak ditemukan',
                status: 'error'
            });
        }
        
        await ncr.update(updateData);
        
        res.json({
            message: 'NCR berhasil diupdate',
            data: ncr,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error updating NCR:', error);
        res.status(500).json({
            message: 'Gagal mengupdate NCR',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// LEGACY TRANSFER QC OPERATIONS (Keep for backward compatibility)
// ====================================================================

exports.createTransferQc = async (req, res) => {
    try {
        const { machine_id, part_number, quantity_good, quantity_ng, operator_id, operation_date, shift, notes } = req.body;
        
        if (!machine_id || !part_number || quantity_good === undefined || !operation_date || !shift) {
            return res.status(400).json({ message: 'Field machine_id, part_number, quantity_good, operation_date, dan shift wajib diisi.' });
        }
        
        console.log('Transfer QC Create attempt:', { machine_id, part_number, quantity_good, quantity_ng, operator_id, operation_date, shift, notes });
        
        const newTransferQc = await TransferQc.create({
            machine_id,
            part_number,
            quantity_good,
            quantity_ng: quantity_ng || 0,
            operator_id,
            operation_date,
            shift,
            notes
        });
        
        res.status(201).json({
            message: 'Catatan Transfer QC berhasil dibuat',
            data: newTransferQc,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error creating transfer QC record:', error);
        res.status(500).json({ 
            message: 'Gagal membuat catatan Transfer QC',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

/**
 * Generate unique inspection number
 */
async function generateInspectionNumber(prefix = 'INS') {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find last number for today
    const lastRecord = await sequelize.query(
        `SELECT inspection_number FROM oqc 
         WHERE inspection_number LIKE '${prefix}-${dateStr}%' 
         ORDER BY inspection_number DESC LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    
    let sequence = 1;
    if (lastRecord.length > 0) {
        const lastNumber = lastRecord[0].inspection_number;
        const lastSequence = parseInt(lastNumber.split('-').pop());
        sequence = lastSequence + 1;
    }
    
    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Generate unique NCR number
 */
async function generateNcrNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find last number for today
    const lastRecord = await sequelize.query(
        `SELECT ncr_number FROM qc_non_conformance 
         WHERE ncr_number LIKE 'NCR-${dateStr}%' 
         ORDER BY ncr_number DESC LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    
    let sequence = 1;
    if (lastRecord.length > 0) {
        const lastNumber = lastRecord[0].ncr_number;
        const lastSequence = parseInt(lastNumber.split('-').pop());
        sequence = lastSequence + 1;
    }
    
    return `NCR-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}
