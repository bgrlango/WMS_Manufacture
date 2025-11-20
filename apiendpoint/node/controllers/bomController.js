// ====================================================================
// BILL OF MATERIALS CONTROLLER - ERP INTEGRATION
// File: backend/node/controllers/bomController.js
// Purpose: Material planning dan BOM management
// Date: 2025-08-27
// ====================================================================

const { BillOfMaterials, InventoryBalance, InventoryLocation } = require('../models/erpModels');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * CREATE BOM - Membuat bill of materials untuk part number
 */
exports.createBOM = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { 
            parent_part_number, 
            materials // Array of {child_part_number, quantity_required, unit_of_measure, scrap_factor, operation_sequence}
        } = req.body;

        if (!parent_part_number || !materials || !Array.isArray(materials)) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'parent_part_number dan materials (array) wajib diisi.' 
            });
        }

        // Validate dan insert setiap material
        const bomEntries = [];
        for (const material of materials) {
            const {
                child_part_number,
                quantity_required,
                unit_of_measure = 'PCS',
                scrap_factor = 0.0000,
                operation_sequence = 1
            } = material;

            if (!child_part_number || !quantity_required) {
                await t.rollback();
                return res.status(400).json({ 
                    message: 'Setiap material harus memiliki child_part_number dan quantity_required.' 
                });
            }

            const [bomId] = await sequelize.query(
                `INSERT INTO bill_of_materials 
                 (parent_part_number, child_part_number, quantity_required, unit_of_measure, 
                  scrap_factor, operation_sequence, effective_date) 
                 VALUES (?, ?, ?, ?, ?, ?, CURDATE())
                 ON DUPLICATE KEY UPDATE
                 quantity_required = VALUES(quantity_required),
                 unit_of_measure = VALUES(unit_of_measure),
                 scrap_factor = VALUES(scrap_factor),
                 operation_sequence = VALUES(operation_sequence)`,
                {
                    replacements: [
                        parent_part_number, child_part_number, quantity_required, 
                        unit_of_measure, scrap_factor, operation_sequence
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                }
            );

            bomEntries.push({
                id: bomId,
                parent_part_number,
                child_part_number,
                quantity_required,
                unit_of_measure,
                scrap_factor,
                operation_sequence
            });
        }

        await t.commit();

        res.status(201).json({
            message: 'Bill of Materials berhasil dibuat',
            data: {
                parent_part_number,
                materials: bomEntries,
                total_materials: bomEntries.length
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error creating BOM:', error);
        res.status(500).json({ 
            message: 'Gagal membuat Bill of Materials', 
            error: error.message 
        });
    }
};

/**
 * GET BOM by parent part number
 */
exports.getBOMByPartNumber = async (req, res) => {
    try {
        const { parent_part_number } = req.params;

        const bomData = await sequelize.query(
            `SELECT 
                bom.*,
                COALESCE(SUM(ib.available_quantity), 0) as available_stock,
                COALESCE(SUM(ib.reserved_quantity), 0) as reserved_stock
             FROM bill_of_materials bom
             LEFT JOIN inventory_balances ib ON bom.child_part_number = ib.part_number
             LEFT JOIN inventory_locations il ON ib.location_id = il.id AND il.location_type = 'raw_material'
             WHERE bom.parent_part_number = ? 
             AND bom.is_active = TRUE 
             AND (bom.expiry_date IS NULL OR bom.expiry_date >= CURDATE())
             GROUP BY bom.id
             ORDER BY bom.operation_sequence, bom.child_part_number`,
            {
                replacements: [parent_part_number],
                type: QueryTypes.SELECT
            }
        );

        res.status(200).json({
            message: 'BOM data berhasil dimuat',
            data: {
                parent_part_number,
                materials: bomData,
                total_materials: bomData.length
            }
        });

    } catch (error) {
        console.error('Error getting BOM:', error);
        res.status(500).json({ 
            message: 'Gagal memuat BOM data', 
            error: error.message 
        });
    }
};

/**
 * CALCULATE MATERIAL REQUIREMENTS untuk production quantity
 */
exports.calculateMaterialRequirements = async (req, res) => {
    try {
        const { parent_part_number, production_quantity } = req.body;

        if (!parent_part_number || !production_quantity) {
            return res.status(400).json({ 
                message: 'parent_part_number dan production_quantity wajib diisi.' 
            });
        }

        // Get BOM dengan stock info
        const materialRequirements = await sequelize.query(
            `SELECT 
                bom.child_part_number,
                bom.quantity_required,
                bom.unit_of_measure,
                bom.scrap_factor,
                bom.operation_sequence,
                (bom.quantity_required * ?) as base_requirement,
                (bom.quantity_required * ? * (1 + bom.scrap_factor)) as total_requirement,
                COALESCE(SUM(ib.available_quantity), 0) as available_stock,
                COALESCE(SUM(ib.reserved_quantity), 0) as reserved_stock,
                CASE 
                    WHEN COALESCE(SUM(ib.available_quantity), 0) >= (bom.quantity_required * ? * (1 + bom.scrap_factor)) 
                    THEN 'SUFFICIENT' 
                    ELSE 'SHORTAGE' 
                END as stock_status,
                GREATEST(0, (bom.quantity_required * ? * (1 + bom.scrap_factor)) - COALESCE(SUM(ib.available_quantity), 0)) as shortage_quantity
             FROM bill_of_materials bom
             LEFT JOIN inventory_balances ib ON bom.child_part_number = ib.part_number
             LEFT JOIN inventory_locations il ON ib.location_id = il.id AND il.location_type = 'raw_material'
             WHERE bom.parent_part_number = ? 
             AND bom.is_active = TRUE 
             AND (bom.expiry_date IS NULL OR bom.expiry_date >= CURDATE())
             GROUP BY bom.id
             ORDER BY bom.operation_sequence, bom.child_part_number`,
            {
                replacements: [
                    production_quantity, production_quantity, production_quantity, 
                    production_quantity, parent_part_number
                ],
                type: QueryTypes.SELECT
            }
        );

        const summary = {
            total_materials: materialRequirements.length,
            sufficient_materials: materialRequirements.filter(m => m.stock_status === 'SUFFICIENT').length,
            shortage_materials: materialRequirements.filter(m => m.stock_status === 'SHORTAGE').length,
            can_produce: materialRequirements.every(m => m.stock_status === 'SUFFICIENT')
        };

        res.status(200).json({
            message: 'Material requirements berhasil dihitung',
            data: {
                parent_part_number,
                production_quantity,
                material_requirements: materialRequirements,
                summary
            }
        });

    } catch (error) {
        console.error('Error calculating material requirements:', error);
        res.status(500).json({ 
            message: 'Gagal menghitung material requirements', 
            error: error.message 
        });
    }
};

/**
 * UPDATE BOM material quantity
 */
exports.updateBOMMaterial = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { bom_id } = req.params;
        const { quantity_required, scrap_factor, operation_sequence } = req.body;

        // Check if BOM exists
        const [existingBOM] = await sequelize.query(
            'SELECT * FROM bill_of_materials WHERE id = ?',
            {
                replacements: [bom_id],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!existingBOM) {
            await t.rollback();
            return res.status(404).json({ message: 'BOM item tidak ditemukan.' });
        }

        // Update BOM
        await sequelize.query(
            `UPDATE bill_of_materials 
             SET quantity_required = COALESCE(?, quantity_required),
                 scrap_factor = COALESCE(?, scrap_factor),
                 operation_sequence = COALESCE(?, operation_sequence)
             WHERE id = ?`,
            {
                replacements: [quantity_required, scrap_factor, operation_sequence, bom_id],
                type: QueryTypes.UPDATE,
                transaction: t
            }
        );

        // Get updated BOM
        const [updatedBOM] = await sequelize.query(
            'SELECT * FROM bill_of_materials WHERE id = ?',
            {
                replacements: [bom_id],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        await t.commit();

        res.status(200).json({
            message: 'BOM material berhasil diupdate',
            data: updatedBOM
        });

    } catch (error) {
        await t.rollback();
        console.error('Error updating BOM material:', error);
        res.status(500).json({ 
            message: 'Gagal update BOM material', 
            error: error.message 
        });
    }
};

/**
 * DELETE BOM material
 */
exports.deleteBOMMaterial = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { bom_id } = req.params;

        // Check if BOM exists
        const [existingBOM] = await sequelize.query(
            'SELECT * FROM bill_of_materials WHERE id = ?',
            {
                replacements: [bom_id],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!existingBOM) {
            await t.rollback();
            return res.status(404).json({ message: 'BOM item tidak ditemukan.' });
        }

        // Soft delete (deactivate)
        await sequelize.query(
            'UPDATE bill_of_materials SET is_active = FALSE WHERE id = ?',
            {
                replacements: [bom_id],
                type: QueryTypes.UPDATE,
                transaction: t
            }
        );

        await t.commit();

        res.status(200).json({
            message: 'BOM material berhasil dihapus',
            data: {
                bom_id,
                parent_part_number: existingBOM.parent_part_number,
                child_part_number: existingBOM.child_part_number
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error deleting BOM material:', error);
        res.status(500).json({ 
            message: 'Gagal menghapus BOM material', 
            error: error.message 
        });
    }
};

module.exports = exports;
