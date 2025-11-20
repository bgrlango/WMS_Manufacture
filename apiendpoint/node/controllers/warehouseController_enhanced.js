/**
 * Enhanced Warehouse Controller - CQRS Command Operations
 * Handles all write operations for Warehouse Management
 */
const { 
    InventoryBalanceEnhanced: InventoryBalance,
    InventoryMovementEnhanced: InventoryMovement,
    InventoryLocationEnhanced: InventoryLocation,
    StockReservation,
    CycleCount,
    CycleCountDetail,
    Delivery,
    Return: ReturnCustomer
} = require('../models');
const sequelize = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

// ====================================================================
// INVENTORY MOVEMENT OPERATIONS
// ====================================================================

/**
 * Create Inventory Movement (IN/OUT/TRANSFER/ADJUSTMENT)
 */
exports.createInventoryMovement = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const {
            part_number,
            movement_type,
            from_location_id,
            to_location_id,
            quantity,
            unit_cost,
            reference_type,
            reference_id,
            reason_code,
            notes,
            batch_number,
            expiry_date,
            serial_numbers
        } = req.body;
        
        // Validation
        if (!part_number || !movement_type || !quantity || !reference_type) {
            return res.status(400).json({
                message: 'part_number, movement_type, quantity, dan reference_type wajib diisi',
                status: 'error'
            });
        }
        
        // Generate movement number
        const movementNumber = await generateMovementNumber(movement_type, transaction);
        
        // Validate movement type requirements
        if (movement_type === 'transfer' && (!from_location_id || !to_location_id)) {
            return res.status(400).json({
                message: 'Transfer movement memerlukan from_location_id dan to_location_id',
                status: 'error'
            });
        }
        
        if (movement_type === 'out' && !from_location_id) {
            return res.status(400).json({
                message: 'Out movement memerlukan from_location_id',
                status: 'error'
            });
        }
        
        if (movement_type === 'in' && !to_location_id) {
            return res.status(400).json({
                message: 'In movement memerlukan to_location_id',
                status: 'error'
            });
        }
        
        // Check stock availability for OUT and TRANSFER movements
        if ((movement_type === 'out' || movement_type === 'transfer') && from_location_id) {
            const balance = await InventoryBalance.findOne({
                where: { 
                    part_number,
                    location_id: from_location_id
                },
                transaction
            });
            
            if (!balance || balance.available_quantity < quantity) {
                return res.status(400).json({
                    message: 'Insufficient stock available',
                    available: balance ? balance.available_quantity : 0,
                    requested: quantity,
                    status: 'error'
                });
            }
        }
        
        // Create movement record
        const movement = await InventoryMovement.create({
            movement_number: movementNumber,
            part_number,
            movement_type,
            from_location_id,
            to_location_id,
            quantity,
            unit_cost,
            reference_type,
            reference_id,
            reason_code,
            notes,
            user_id: req.user.id,
            batch_number,
            expiry_date,
            serial_numbers
        }, { transaction });
        
        // Update inventory balances
        await updateInventoryBalances(movement, transaction);
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Inventory movement berhasil dibuat',
            data: movement,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating inventory movement:', error);
        res.status(500).json({
            message: 'Gagal membuat inventory movement',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Update Inventory Balances based on Movement
 */
async function updateInventoryBalances(movement, transaction) {
    const { 
        part_number, 
        movement_type, 
        from_location_id, 
        to_location_id, 
        quantity, 
        unit_cost 
    } = movement;
    
    // Handle FROM location (decrease stock)
    if (from_location_id && (movement_type === 'out' || movement_type === 'transfer')) {
        const fromBalance = await InventoryBalance.findOne({
            where: { part_number, location_id: from_location_id },
            transaction
        });
        
        if (fromBalance) {
            await fromBalance.update({
                available_quantity: fromBalance.available_quantity - quantity,
                last_movement_date: new Date()
            }, { transaction });
        }
    }
    
    // Handle TO location (increase stock)
    if (to_location_id && (movement_type === 'in' || movement_type === 'transfer')) {
        let toBalance = await InventoryBalance.findOne({
            where: { part_number, location_id: to_location_id },
            transaction
        });
        
        if (toBalance) {
            // Update weighted average cost if unit_cost provided
            let newAverageCost = toBalance.average_cost;
            if (unit_cost && movement_type === 'in') {
                const totalValue = (toBalance.available_quantity * toBalance.average_cost) + (quantity * unit_cost);
                const totalQuantity = toBalance.available_quantity + quantity;
                newAverageCost = totalValue / totalQuantity;
            }
            
            await toBalance.update({
                available_quantity: toBalance.available_quantity + quantity,
                average_cost: newAverageCost,
                last_movement_date: new Date()
            }, { transaction });
        } else {
            // Create new balance record
            await InventoryBalance.create({
                part_number,
                location_id: to_location_id,
                available_quantity: quantity,
                average_cost: unit_cost || 0,
                last_movement_date: new Date()
            }, { transaction });
        }
    }
    
    // Handle ADJUSTMENT movements
    if (movement_type === 'adjustment') {
        const location_id = to_location_id || from_location_id;
        const adjustmentQuantity = to_location_id ? quantity : -quantity;
        
        let balance = await InventoryBalance.findOne({
            where: { part_number, location_id },
            transaction
        });
        
        if (balance) {
            await balance.update({
                available_quantity: balance.available_quantity + adjustmentQuantity,
                last_movement_date: new Date()
            }, { transaction });
        } else if (adjustmentQuantity > 0) {
            await InventoryBalance.create({
                part_number,
                location_id,
                available_quantity: adjustmentQuantity,
                average_cost: unit_cost || 0,
                last_movement_date: new Date()
            }, { transaction });
        }
    }
}

// ====================================================================
// STOCK RESERVATION OPERATIONS
// ====================================================================

/**
 * Create Stock Reservation
 */
exports.createStockReservation = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const {
            part_number,
            location_id,
            reserved_quantity,
            reservation_type,
            reference_id,
            expiry_date,
            notes
        } = req.body;
        
        if (!part_number || !location_id || !reserved_quantity || !reservation_type) {
            return res.status(400).json({
                message: 'part_number, location_id, reserved_quantity, dan reservation_type wajib diisi',
                status: 'error'
            });
        }
        
        // Check available stock
        const balance = await InventoryBalance.findOne({
            where: { part_number, location_id },
            transaction
        });
        
        if (!balance || balance.available_quantity < reserved_quantity) {
            return res.status(400).json({
                message: 'Insufficient stock untuk reservation',
                available: balance ? balance.available_quantity : 0,
                requested: reserved_quantity,
                status: 'error'
            });
        }
        
        // Generate reservation number
        const reservationNumber = await generateReservationNumber(transaction);
        
        // Create reservation
        const reservation = await StockReservation.create({
            reservation_number: reservationNumber,
            part_number,
            location_id,
            reserved_quantity,
            reservation_type,
            reference_id,
            reserved_by: req.user.id,
            expiry_date,
            notes
        }, { transaction });
        
        // Update inventory balance
        await balance.update({
            available_quantity: balance.available_quantity - reserved_quantity,
            reserved_quantity: balance.reserved_quantity + reserved_quantity
        }, { transaction });
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Stock reservation berhasil dibuat',
            data: reservation,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating stock reservation:', error);
        res.status(500).json({
            message: 'Gagal membuat stock reservation',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Cancel Stock Reservation
 */
exports.cancelStockReservation = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const reservation = await StockReservation.findByPk(id, { transaction });
        
        if (!reservation) {
            return res.status(404).json({
                message: 'Reservation tidak ditemukan',
                status: 'error'
            });
        }
        
        if (reservation.status !== 'active') {
            return res.status(400).json({
                message: 'Hanya reservation dengan status active yang bisa dibatalkan',
                status: 'error'
            });
        }
        
        // Update reservation status
        await reservation.update({
            status: 'cancelled',
            notes: reason ? `${reservation.notes || ''} - Cancelled: ${reason}` : reservation.notes
        }, { transaction });
        
        // Return stock to available
        const balance = await InventoryBalance.findOne({
            where: { 
                part_number: reservation.part_number,
                location_id: reservation.location_id
            },
            transaction
        });
        
        if (balance) {
            await balance.update({
                available_quantity: balance.available_quantity + reservation.reserved_quantity,
                reserved_quantity: balance.reserved_quantity - reservation.reserved_quantity
            }, { transaction });
        }
        
        await transaction.commit();
        
        res.json({
            message: 'Stock reservation berhasil dibatalkan',
            data: reservation,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error cancelling stock reservation:', error);
        res.status(500).json({
            message: 'Gagal membatalkan stock reservation',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// CYCLE COUNT OPERATIONS
// ====================================================================

/**
 * Create Cycle Count
 */
exports.createCycleCount = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const {
            location_id,
            count_date,
            count_type,
            assigned_to,
            notes
        } = req.body;
        
        if (!location_id || !count_date || !count_type) {
            return res.status(400).json({
                message: 'location_id, count_date, dan count_type wajib diisi',
                status: 'error'
            });
        }
        
        // Generate count number
        const countNumber = await generateCountNumber(transaction);
        
        // Create cycle count
        const cycleCount = await CycleCount.create({
            count_number: countNumber,
            location_id,
            count_date,
            count_type,
            assigned_to,
            created_by: req.user.id,
            notes
        }, { transaction });
        
        // Get all inventory balances for location
        const balances = await InventoryBalance.findAll({
            where: { location_id },
            transaction
        });
        
        // Create count details for each part
        const countDetails = [];
        for (const balance of balances) {
            const detail = await CycleCountDetail.create({
                cycle_count_id: cycleCount.id,
                part_number: balance.part_number,
                system_quantity: balance.available_quantity + balance.reserved_quantity + balance.quarantine_quantity
            }, { transaction });
            countDetails.push(detail);
        }
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Cycle count berhasil dibuat',
            data: {
                cycleCount,
                details: countDetails
            },
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating cycle count:', error);
        res.status(500).json({
            message: 'Gagal membuat cycle count',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Update Cycle Count Detail
 */
exports.updateCycleCountDetail = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { detail_id } = req.params;
        const {
            counted_quantity,
            reason_code,
            notes
        } = req.body;
        
        if (counted_quantity === undefined || counted_quantity === null) {
            return res.status(400).json({
                message: 'counted_quantity wajib diisi',
                status: 'error'
            });
        }
        
        const detail = await CycleCountDetail.findByPk(detail_id, { transaction });
        
        if (!detail) {
            return res.status(404).json({
                message: 'Cycle count detail tidak ditemukan',
                status: 'error'
            });
        }
        
        // Calculate variance
        const variance_quantity = counted_quantity - detail.system_quantity;
        
        // Get average cost for variance value calculation
        const balance = await InventoryBalance.findOne({
            where: { 
                part_number: detail.part_number
            },
            transaction
        });
        
        const variance_value = variance_quantity * (balance ? balance.average_cost : 0);
        
        // Update detail
        await detail.update({
            counted_quantity,
            variance_quantity,
            variance_value,
            reason_code,
            notes,
            counted_by: req.user.id,
            counted_date: new Date()
        }, { transaction });
        
        await transaction.commit();
        
        res.json({
            message: 'Cycle count detail berhasil diupdate',
            data: detail,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating cycle count detail:', error);
        res.status(500).json({
            message: 'Gagal mengupdate cycle count detail',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Complete Cycle Count and Apply Adjustments
 */
exports.completeCycleCount = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { apply_adjustments = true } = req.body;
        
        const cycleCount = await CycleCount.findByPk(id, {
            include: [
                {
                    model: CycleCountDetail,
                    as: 'details'
                }
            ],
            transaction
        });
        
        if (!cycleCount) {
            return res.status(404).json({
                message: 'Cycle count tidak ditemukan',
                status: 'error'
            });
        }
        
        if (cycleCount.status === 'completed') {
            return res.status(400).json({
                message: 'Cycle count sudah completed',
                status: 'error'
            });
        }
        
        // Apply adjustments if requested
        if (apply_adjustments) {
            for (const detail of cycleCount.details) {
                if (detail.variance_quantity !== 0) {
                    // Create adjustment movement
                    const movementNumber = await generateMovementNumber('adjustment', transaction);
                    
                    await InventoryMovement.create({
                        movement_number: movementNumber,
                        part_number: detail.part_number,
                        movement_type: 'adjustment',
                        to_location_id: detail.variance_quantity > 0 ? cycleCount.location_id : null,
                        from_location_id: detail.variance_quantity < 0 ? cycleCount.location_id : null,
                        quantity: Math.abs(detail.variance_quantity),
                        reference_type: 'adjustment',
                        reference_id: cycleCount.id,
                        reason_code: detail.reason_code || 'cycle_count_adjustment',
                        notes: `Cycle count adjustment - Count: ${detail.count_number}`,
                        user_id: req.user.id
                    }, { transaction });
                    
                    // Update inventory balance
                    const balance = await InventoryBalance.findOne({
                        where: {
                            part_number: detail.part_number,
                            location_id: cycleCount.location_id
                        },
                        transaction
                    });
                    
                    if (balance) {
                        await balance.update({
                            available_quantity: detail.counted_quantity,
                            last_count_date: new Date()
                        }, { transaction });
                    }
                }
            }
        }
        
        // Update cycle count status
        await cycleCount.update({
            status: 'completed',
            approved_by: req.user.id
        }, { transaction });
        
        await transaction.commit();
        
        res.json({
            message: 'Cycle count berhasil dicomplete',
            adjustments_applied: apply_adjustments,
            data: cycleCount,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error completing cycle count:', error);
        res.status(500).json({
            message: 'Gagal complete cycle count',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// LOCATION MANAGEMENT OPERATIONS
// ====================================================================

/**
 * Create Inventory Location
 */
exports.createInventoryLocation = async (req, res) => {
    try {
        const {
            location_code,
            location_name,
            location_type,
            warehouse_zone,
            aisle,
            rack,
            shelf,
            bin,
            capacity,
            temperature_controlled,
            hazardous_materials
        } = req.body;
        
        if (!location_code || !location_name || !location_type) {
            return res.status(400).json({
                message: 'location_code, location_name, dan location_type wajib diisi',
                status: 'error'
            });
        }
        
        const location = await InventoryLocation.create({
            location_code,
            location_name,
            location_type,
            warehouse_zone,
            aisle,
            rack,
            shelf,
            bin,
            capacity,
            temperature_controlled,
            hazardous_materials
        });
        
        res.status(201).json({
            message: 'Location berhasil dibuat',
            data: location,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error creating location:', error);
        res.status(500).json({
            message: 'Gagal membuat location',
            error: error.message,
            status: 'error'
        });
    }
};

/**
 * Update Inventory Location
 */
exports.updateInventoryLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const location = await InventoryLocation.findByPk(id);
        
        if (!location) {
            return res.status(404).json({
                message: 'Location tidak ditemukan',
                status: 'error'
            });
        }
        
        await location.update(updateData);
        
        res.json({
            message: 'Location berhasil diupdate',
            data: location,
            status: 'success'
        });
        
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({
            message: 'Gagal mengupdate location',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// LEGACY WAREHOUSE OPERATIONS (Keep for backward compatibility)
// ====================================================================

/**
 * Create Delivery (Legacy)
 */
exports.createDelivery = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { part_number, quantity_shipped, delivery_date, customer, notes } = req.body;
        
        if (!part_number || !quantity_shipped || !delivery_date || !customer) {
            return res.status(400).json({
                message: 'part_number, quantity_shipped, delivery_date, dan customer wajib diisi'
            });
        }
        
        const deliveryOrderNumber = await generateDeliveryOrder(transaction);
        
        const newDelivery = await Delivery.create({
            delivery_order_number: deliveryOrderNumber,
            part_number,
            quantity_shipped,
            delivery_date,
            user_id: req.user.id,
            customer,
            notes
        }, { transaction });
        
        await transaction.commit();
        
        res.status(201).json({
            message: 'Delivery berhasil dibuat',
            data: newDelivery,
            status: 'success'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating delivery:', error);
        res.status(500).json({
            message: 'Gagal membuat delivery',
            error: error.message,
            status: 'error'
        });
    }
};

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

/**
 * Generate Movement Number
 */
async function generateMovementNumber(type, transaction) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = type.toUpperCase().substring(0, 3);
    
    const lastRecord = await sequelize.query(
        `SELECT movement_number FROM inventory_movements 
         WHERE movement_number LIKE '${prefix}-${dateStr}%' 
         ORDER BY movement_number DESC LIMIT 1`,
        { type: QueryTypes.SELECT, transaction }
    );
    
    let sequence = 1;
    if (lastRecord.length > 0) {
        const lastNumber = lastRecord[0].movement_number;
        const lastSequence = parseInt(lastNumber.split('-').pop());
        sequence = lastSequence + 1;
    }
    
    return `${prefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Generate Reservation Number
 */
async function generateReservationNumber(transaction) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastRecord = await sequelize.query(
        `SELECT reservation_number FROM stock_reservations 
         WHERE reservation_number LIKE 'RSV-${dateStr}%' 
         ORDER BY reservation_number DESC LIMIT 1`,
        { type: QueryTypes.SELECT, transaction }
    );
    
    let sequence = 1;
    if (lastRecord.length > 0) {
        const lastNumber = lastRecord[0].reservation_number;
        const lastSequence = parseInt(lastNumber.split('-').pop());
        sequence = lastSequence + 1;
    }
    
    return `RSV-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Generate Count Number
 */
async function generateCountNumber(transaction) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastRecord = await sequelize.query(
        `SELECT count_number FROM cycle_counts 
         WHERE count_number LIKE 'CC-${dateStr}%' 
         ORDER BY count_number DESC LIMIT 1`,
        { type: QueryTypes.SELECT, transaction }
    );
    
    let sequence = 1;
    if (lastRecord.length > 0) {
        const lastNumber = lastRecord[0].count_number;
        const lastSequence = parseInt(lastNumber.split('-').pop());
        sequence = lastSequence + 1;
    }
    
    return `CC-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Generate Delivery Order (Legacy)
 */
const generateDeliveryOrder = async (transaction) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}`;
    const prefix = `DO-${datePart}-`;

    const [lastOrder] = await sequelize.query(
        'SELECT delivery_order_number FROM delivery WHERE delivery_order_number LIKE ? ORDER BY delivery_order_number DESC LIMIT 1 FOR UPDATE',
        {
            replacements: [`${prefix}%`],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    let nextSequence = 1;
    if (lastOrder) {
        const lastSequenceNumber = parseInt(lastOrder.delivery_order_number.split('-').pop(), 10);
        nextSequence = lastSequenceNumber + 1;
    }

    const sequencePart = nextSequence.toString().padStart(4, '0');
    return `${prefix}${sequencePart}`;
};
