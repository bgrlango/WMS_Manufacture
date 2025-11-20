// ====================================================================
// INVENTORY CONTROLLER - ERP INTEGRATION
// File: backend/node/controllers/inventoryController.js
// Purpose: Inventory management dengan multi-location tracking
// Date: 2025-08-27
// ====================================================================

const { 
    InventoryLocation, 
    InventoryMovement, 
    InventoryBalance 
} = require('../models/erpModels');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/**
 * Generate movement number untuk inventory movements
 */
const generateMovementNumber = async (transaction, movementType) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}`;
    const typePrefix = movementType.toUpperCase().substring(0, 3);
    const prefix = `MOV-${typePrefix}-${datePart}-`;

    const [lastMovement] = await sequelize.query(
        'SELECT movement_number FROM inventory_movements WHERE movement_number LIKE ? ORDER BY movement_number DESC LIMIT 1 FOR UPDATE',
        {
            replacements: [`${prefix}%`],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    let nextSequence = 1;
    if (lastMovement) {
        const lastSequenceNumber = parseInt(lastMovement.movement_number.split('-').pop(), 10);
        nextSequence = lastSequenceNumber + 1;
    }

    const sequencePart = nextSequence.toString().padStart(4, '0');
    return `${prefix}${sequencePart}`;
};

/**
 * Update inventory balance setelah movement
 */
const updateInventoryBalance = async (transaction, partNumber, locationId, quantityChange, operation = 'add', unitCost = null) => {
    const operator = operation === 'add' ? '+' : '-';
    
    // Check if balance record exists
    const [existingBalance] = await sequelize.query(
        'SELECT id, available_quantity, average_cost FROM inventory_balances WHERE part_number = ? AND location_id = ?',
        {
            replacements: [partNumber, locationId],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    if (existingBalance) {
        // Calculate new average cost if unit cost provided
        let newAverageCost = existingBalance.average_cost;
        if (unitCost && operation === 'add') {
            const currentValue = existingBalance.available_quantity * existingBalance.average_cost;
            const newValue = quantityChange * unitCost;
            const newTotalQty = existingBalance.available_quantity + quantityChange;
            
            if (newTotalQty > 0) {
                newAverageCost = (currentValue + newValue) / newTotalQty;
            }
        }

        // Update existing balance
        await sequelize.query(
            `UPDATE inventory_balances 
             SET available_quantity = available_quantity ${operator} ?, 
                 average_cost = ?,
                 last_movement_date = NOW() 
             WHERE part_number = ? AND location_id = ?`,
            {
                replacements: [Math.abs(quantityChange), newAverageCost, partNumber, locationId],
                type: QueryTypes.UPDATE,
                transaction
            }
        );
    } else {
        // Create new balance record
        const initialQuantity = operation === 'add' ? quantityChange : 0;
        const initialCost = unitCost || 0;
        
        await sequelize.query(
            `INSERT INTO inventory_balances 
             (part_number, location_id, available_quantity, average_cost, last_movement_date) 
             VALUES (?, ?, ?, ?, NOW())`,
            {
                replacements: [partNumber, locationId, initialQuantity, initialCost],
                type: QueryTypes.INSERT,
                transaction
            }
        );
    }
};

// ====================================================================
// MAIN CONTROLLERS
// ====================================================================

/**
 * INVENTORY RECEIPT - Terima barang dari supplier/production
 */
exports.createInventoryReceipt = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            part_number,
            quantity,
            unit_cost,
            location_code,
            reference_type = 'receipt',
            reference_id,
            notes,
            supplier_name
        } = req.body;

        if (!part_number || !quantity || !location_code) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'part_number, quantity, dan location_code wajib diisi.' 
            });
        }

        const userId = req.user.id;

        // Get location
        const [location] = await sequelize.query(
            'SELECT id, location_name FROM inventory_locations WHERE location_code = ? AND is_active = TRUE',
            {
                replacements: [location_code],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!location) {
            await t.rollback();
            return res.status(400).json({ 
                message: `Location ${location_code} tidak ditemukan atau tidak aktif.` 
            });
        }

        // Generate movement number
        const movementNumber = await generateMovementNumber(t, 'in');

        // Create inventory movement
        const [movementId] = await sequelize.query(
            `INSERT INTO inventory_movements 
             (movement_number, part_number, movement_type, to_location_id, quantity, 
              unit_cost, reference_type, reference_id, reason_code, notes, user_id) 
             VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'RECEIPT', ?, ?)`,
            {
                replacements: [
                    movementNumber, // 1. movement_number
                    part_number,    // 2. part_number  
                    location.id,    // 3. to_location_id
                    quantity,       // 4. quantity
                    unit_cost,      // 5. unit_cost
                    reference_type, // 6. reference_type
                    reference_id || null,   // 7. reference_id (can be null)
                    notes || `Receipt from ${supplier_name || 'supplier'}`, // 8. notes
                    userId          // 9. user_id
                ],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );

        // Update inventory balance
        await updateInventoryBalance(t, part_number, location.id, quantity, 'add', unit_cost);

        // Get movement details
        const [newMovement] = await sequelize.query(
            `SELECT im.*, il.location_code, il.location_name 
             FROM inventory_movements im
             JOIN inventory_locations il ON im.to_location_id = il.id
             WHERE im.id = ?`,
            {
                replacements: [movementId],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        await t.commit();

        res.status(201).json({
            message: 'Inventory receipt berhasil dibuat',
            data: {
                movement: newMovement,
                updated_balance: true
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error creating inventory receipt:', error);
        res.status(500).json({ 
            message: 'Gagal membuat inventory receipt', 
            error: error.message 
        });
    }
};

/**
 * INVENTORY TRANSFER - Pindah barang antar location
 */
exports.createInventoryTransfer = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            part_number,
            quantity,
            from_location_code,
            to_location_code,
            reason_code = 'TRANSFER',
            notes
        } = req.body;

        if (!part_number || !quantity || !from_location_code || !to_location_code) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'part_number, quantity, from_location_code, dan to_location_code wajib diisi.' 
            });
        }

        const userId = req.user.id;

        // Get from location
        const [fromLocation] = await sequelize.query(
            'SELECT id, location_name FROM inventory_locations WHERE location_code = ? AND is_active = TRUE',
            {
                replacements: [from_location_code],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!fromLocation) {
            await t.rollback();
            return res.status(400).json({ 
                message: `From location ${from_location_code} tidak ditemukan.` 
            });
        }

        // Get to location
        const [toLocation] = await sequelize.query(
            'SELECT id, location_name FROM inventory_locations WHERE location_code = ? AND is_active = TRUE',
            {
                replacements: [to_location_code],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!toLocation) {
            await t.rollback();
            return res.status(400).json({ 
                message: `To location ${to_location_code} tidak ditemukan.` 
            });
        }

        // Check available stock
        const [stockInfo] = await sequelize.query(
            'SELECT available_quantity FROM inventory_balances WHERE part_number = ? AND location_id = ?',
            {
                replacements: [part_number, fromLocation.id],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        const availableQty = stockInfo?.available_quantity || 0;
        if (availableQty < quantity) {
            await t.rollback();
            return res.status(400).json({ 
                message: `Stock tidak mencukupi. Available: ${availableQty}, Required: ${quantity}` 
            });
        }

        // Generate movement number
        const movementNumber = await generateMovementNumber(t, 'transfer');

        // Create inventory movement
        const [movementId] = await sequelize.query(
            `INSERT INTO inventory_movements 
             (movement_number, part_number, movement_type, from_location_id, to_location_id, 
              quantity, reference_type, reason_code, notes, user_id) 
             VALUES (?, ?, 'transfer', ?, ?, ?, 'transfer', ?, ?, ?)`,
            {
                replacements: [
                    movementNumber, part_number, fromLocation.id, toLocation.id,
                    quantity, reason_code, notes, userId
                ],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );

        // Update from location (decrease)
        await updateInventoryBalance(t, part_number, fromLocation.id, quantity, 'subtract');

        // Update to location (increase)
        await updateInventoryBalance(t, part_number, toLocation.id, quantity, 'add');

        // Get movement details
        const [newMovement] = await sequelize.query(
            `SELECT im.*, 
                    il_from.location_code as from_location_code, il_from.location_name as from_location_name,
                    il_to.location_code as to_location_code, il_to.location_name as to_location_name
             FROM inventory_movements im
             JOIN inventory_locations il_from ON im.from_location_id = il_from.id
             JOIN inventory_locations il_to ON im.to_location_id = il_to.id
             WHERE im.id = ?`,
            {
                replacements: [movementId],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        await t.commit();

        res.status(201).json({
            message: 'Inventory transfer berhasil dibuat',
            data: {
                movement: newMovement,
                transferred_quantity: quantity
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error creating inventory transfer:', error);
        res.status(500).json({ 
            message: 'Gagal membuat inventory transfer', 
            error: error.message 
        });
    }
};

/**
 * INVENTORY ADJUSTMENT - Sesuaikan stock karena cycle count, scrap, etc
 */
exports.createInventoryAdjustment = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const {
            part_number,
            location_code,
            adjustment_quantity, // Positive for increase, negative for decrease
            reason_code,
            notes
        } = req.body;

        if (!part_number || !location_code || adjustment_quantity === undefined) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'part_number, location_code, dan adjustment_quantity wajib diisi.' 
            });
        }

        const userId = req.user.id;

        // Get location
        const [location] = await sequelize.query(
            'SELECT id, location_name FROM inventory_locations WHERE location_code = ? AND is_active = TRUE',
            {
                replacements: [location_code],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!location) {
            await t.rollback();
            return res.status(400).json({ 
                message: `Location ${location_code} tidak ditemukan.` 
            });
        }

        // Generate movement number
        const movementNumber = await generateMovementNumber(t, 'adjustment');

        // Create inventory movement
        const movementType = adjustment_quantity > 0 ? 'in' : 'out';
        const toLocationId = adjustment_quantity > 0 ? location.id : null;
        const fromLocationId = adjustment_quantity > 0 ? null : location.id;

        const [movementId] = await sequelize.query(
            `INSERT INTO inventory_movements 
             (movement_number, part_number, movement_type, from_location_id, to_location_id, 
              quantity, reference_type, reason_code, notes, user_id) 
             VALUES (?, ?, 'adjustment', ?, ?, ?, 'adjustment', ?, ?, ?)`,
            {
                replacements: [
                    movementNumber, part_number, fromLocationId, toLocationId,
                    Math.abs(adjustment_quantity), reason_code || 'STOCK_ADJUSTMENT', notes, userId
                ],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );

        // Update inventory balance
        const operation = adjustment_quantity > 0 ? 'add' : 'subtract';
        await updateInventoryBalance(t, part_number, location.id, Math.abs(adjustment_quantity), operation);

        // Get movement details
        const [newMovement] = await sequelize.query(
            `SELECT im.*, il.location_code, il.location_name 
             FROM inventory_movements im
             LEFT JOIN inventory_locations il ON (im.to_location_id = il.id OR im.from_location_id = il.id)
             WHERE im.id = ?`,
            {
                replacements: [movementId],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        await t.commit();

        res.status(201).json({
            message: 'Inventory adjustment berhasil dibuat',
            data: {
                movement: newMovement,
                adjustment_quantity: adjustment_quantity
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error creating inventory adjustment:', error);
        res.status(500).json({ 
            message: 'Gagal membuat inventory adjustment', 
            error: error.message 
        });
    }
};

/**
 * GET INVENTORY BALANCES dengan filter
 */
exports.getInventoryBalances = async (req, res) => {
    try {
        const { 
            part_number, 
            location_type, 
            location_code,
            low_stock_only = false,
            minimum_quantity = 0
        } = req.query;

        let whereClause = 'WHERE il.is_active = TRUE';
        let replacements = [];

        if (part_number) {
            whereClause += ' AND ib.part_number LIKE ?';
            replacements.push(`%${part_number}%`);
        }

        if (location_type) {
            whereClause += ' AND il.location_type = ?';
            replacements.push(location_type);
        }

        if (location_code) {
            whereClause += ' AND il.location_code = ?';
            replacements.push(location_code);
        }

        if (low_stock_only === 'true') {
            whereClause += ' AND ib.available_quantity <= ?';
            replacements.push(minimum_quantity);
        }

        const inventoryBalances = await sequelize.query(
            `SELECT 
                ib.part_number,
                il.location_code, il.location_name, il.location_type, il.warehouse_zone,
                ib.available_quantity, ib.reserved_quantity, ib.quarantine_quantity,
                (ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) as total_quantity,
                ib.average_cost,
                (ib.available_quantity * ib.average_cost) as inventory_value,
                ib.last_movement_date, ib.last_count_date,
                ib.updated_at
             FROM inventory_balances ib
             JOIN inventory_locations il ON ib.location_id = il.id
             ${whereClause}
             ORDER BY ib.part_number, il.location_type, il.location_code`,
            {
                replacements,
                type: QueryTypes.SELECT
            }
        );

        // Calculate summary
        const summary = {
            total_locations: [...new Set(inventoryBalances.map(b => b.location_code))].length,
            total_part_numbers: [...new Set(inventoryBalances.map(b => b.part_number))].length,
            total_inventory_value: inventoryBalances.reduce((sum, b) => sum + parseFloat(b.inventory_value || 0), 0),
            low_stock_items: inventoryBalances.filter(b => b.available_quantity <= minimum_quantity).length
        };

        res.status(200).json({
            message: 'Inventory balances berhasil dimuat',
            data: {
                balances: inventoryBalances,
                summary
            }
        });

    } catch (error) {
        console.error('Error getting inventory balances:', error);
        res.status(500).json({ 
            message: 'Gagal memuat inventory balances', 
            error: error.message 
        });
    }
};

/**
 * GET INVENTORY MOVEMENTS dengan filter
 */
exports.getInventoryMovements = async (req, res) => {
    try {
        const { 
            part_number, 
            movement_type, 
            location_code,
            date_from,
            date_to,
            limit = 100
        } = req.query;

        let whereClause = 'WHERE 1=1';
        let replacements = [];

        if (part_number) {
            whereClause += ' AND im.part_number LIKE ?';
            replacements.push(`%${part_number}%`);
        }

        if (movement_type) {
            whereClause += ' AND im.movement_type = ?';
            replacements.push(movement_type);
        }

        if (location_code) {
            whereClause += ' AND (il_from.location_code = ? OR il_to.location_code = ?)';
            replacements.push(location_code, location_code);
        }

        if (date_from) {
            whereClause += ' AND DATE(im.movement_date) >= ?';
            replacements.push(date_from);
        }

        if (date_to) {
            whereClause += ' AND DATE(im.movement_date) <= ?';
            replacements.push(date_to);
        }

        const inventoryMovements = await sequelize.query(
            `SELECT 
                im.movement_number, im.part_number, im.movement_type,
                im.quantity, im.unit_cost, im.movement_date,
                im.reference_type, im.reference_id, im.reason_code, im.notes,
                il_from.location_code as from_location, il_from.location_name as from_location_name,
                il_to.location_code as to_location, il_to.location_name as to_location_name,
                u.username as created_by_user
             FROM inventory_movements im
             LEFT JOIN inventory_locations il_from ON im.from_location_id = il_from.id
             LEFT JOIN inventory_locations il_to ON im.to_location_id = il_to.id
             LEFT JOIN users u ON im.user_id = u.id
             ${whereClause}
             ORDER BY im.movement_date DESC
             LIMIT ?`,
            {
                replacements: [...replacements, parseInt(limit)],
                type: QueryTypes.SELECT
            }
        );

        res.status(200).json({
            message: 'Inventory movements berhasil dimuat',
            data: {
                movements: inventoryMovements,
                total_records: inventoryMovements.length
            }
        });

    } catch (error) {
        console.error('Error getting inventory movements:', error);
        res.status(500).json({ 
            message: 'Gagal memuat inventory movements', 
            error: error.message 
        });
    }
};

/**
 * GET INVENTORY LOCATIONS
 */
exports.getInventoryLocations = async (req, res) => {
    try {
        const { location_type, active_only = 'true' } = req.query;

        let whereClause = 'WHERE 1=1';
        let replacements = [];

        if (location_type) {
            whereClause += ' AND location_type = ?';
            replacements.push(location_type);
        }

        if (active_only === 'true') {
            whereClause += ' AND is_active = TRUE';
        }

        const locations = await sequelize.query(
            `SELECT 
                location_code, location_name, location_type, warehouse_zone,
                capacity, current_utilization, is_active, created_at
             FROM inventory_locations
             ${whereClause}
             ORDER BY location_type, location_code`,
            {
                replacements,
                type: QueryTypes.SELECT
            }
        );

        res.status(200).json({
            message: 'Inventory locations berhasil dimuat',
            data: locations
        });

    } catch (error) {
        console.error('Error getting inventory locations:', error);
        res.status(500).json({ 
            message: 'Gagal memuat inventory locations', 
            error: error.message 
        });
    }
};

module.exports = exports;
