/**
 * Warehouse Routes - CQRS Command Operations
 * All POST/PUT/DELETE operations for Warehouse Management
 */
const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController_enhanced');
const authMiddleware = require('../middleware/authMiddleware');

// Create CQRS middleware inline for now
const cqrsCommandMiddleware = (req, res, next) => {
    // Allow only write operations (POST, PUT, DELETE, PATCH)
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return res.status(405).json({
            error: 'Method Not Allowed',
            message: `${req.method} operations should use Query Service on port 2025`,
            pattern: 'CQRS Separation'
        });
    }
    next();
};

// Apply authentication and CQRS command middleware to all routes
router.use(authMiddleware);
router.use(cqrsCommandMiddleware);

// ====================================================================
// INVENTORY MOVEMENT ROUTES (COMMAND OPERATIONS)
// ====================================================================

/**
 * @route   POST /api/warehouse/movements
 * @desc    Create inventory movement (IN/OUT/TRANSFER/ADJUSTMENT)
 * @access  Private
 */
router.post('/movements', warehouseController.createInventoryMovement);

// ====================================================================
// STOCK RESERVATION ROUTES (COMMAND OPERATIONS)
// ====================================================================

/**
 * @route   POST /api/warehouse/reservations
 * @desc    Create stock reservation
 * @access  Private
 */
router.post('/reservations', warehouseController.createStockReservation);

/**
 * @route   PUT /api/warehouse/reservations/:id/cancel
 * @desc    Cancel stock reservation
 * @access  Private
 */
router.put('/reservations/:id/cancel', warehouseController.cancelStockReservation);

// ====================================================================
// CYCLE COUNT ROUTES (COMMAND OPERATIONS)
// ====================================================================

/**
 * @route   POST /api/warehouse/cycle-counts
 * @desc    Create cycle count
 * @access  Private
 */
router.post('/cycle-counts', warehouseController.createCycleCount);

/**
 * @route   PUT /api/warehouse/cycle-counts/details/:detail_id
 * @desc    Update cycle count detail
 * @access  Private
 */
router.put('/cycle-counts/details/:detail_id', warehouseController.updateCycleCountDetail);

/**
 * @route   PUT /api/warehouse/cycle-counts/:id/complete
 * @desc    Complete cycle count and apply adjustments
 * @access  Private
 */
router.put('/cycle-counts/:id/complete', warehouseController.completeCycleCount);

// ====================================================================
// LOCATION MANAGEMENT ROUTES (COMMAND OPERATIONS)
// ====================================================================

/**
 * @route   POST /api/warehouse/locations
 * @desc    Create inventory location
 * @access  Private
 */
router.post('/locations', warehouseController.createInventoryLocation);

/**
 * @route   PUT /api/warehouse/locations/:id
 * @desc    Update inventory location
 * @access  Private
 */
router.put('/locations/:id', warehouseController.updateInventoryLocation);

// ====================================================================
// LEGACY WAREHOUSE ROUTES (COMMAND OPERATIONS)
// ====================================================================

/**
 * @route   POST /api/warehouse/deliveries
 * @desc    Create delivery (legacy support)
 * @access  Private
 */
router.post('/deliveries', warehouseController.createDelivery);

// ====================================================================
// BULK OPERATIONS ROUTES
// ====================================================================

/**
 * @route   POST /api/warehouse/movements/bulk
 * @desc    Create multiple inventory movements
 * @access  Private
 */
router.post('/movements/bulk', async (req, res) => {
    try {
        const { movements } = req.body;
        
        if (!movements || !Array.isArray(movements) || movements.length === 0) {
            return res.status(400).json({
                message: 'movements array is required and must not be empty',
                status: 'error'
            });
        }
        
        if (movements.length > 100) {
            return res.status(400).json({
                message: 'Maximum 100 movements allowed per bulk operation',
                status: 'error'
            });
        }
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < movements.length; i++) {
            try {
                // Simulate individual movement creation
                req.body = movements[i];
                const mockRes = {
                    status: (code) => ({
                        json: (data) => {
                            if (code >= 200 && code < 300) {
                                results.push({ index: i, ...data });
                            } else {
                                errors.push({ index: i, error: data });
                            }
                        }
                    })
                };
                
                await warehouseController.createInventoryMovement(req, mockRes);
            } catch (error) {
                errors.push({ 
                    index: i, 
                    error: { 
                        message: error.message, 
                        status: 'error' 
                    } 
                });
            }
        }
        
        res.status(errors.length > 0 ? 207 : 201).json({
            message: `Bulk operation completed: ${results.length} success, ${errors.length} errors`,
            successful: results,
            errors: errors,
            total: movements.length,
            status: errors.length > 0 ? 'partial_success' : 'success'
        });
        
    } catch (error) {
        console.error('Error in bulk movements:', error);
        res.status(500).json({
            message: 'Gagal melakukan bulk movements',
            error: error.message,
            status: 'error'
        });
    }
});

/**
 * @route   POST /api/warehouse/reservations/bulk-cancel
 * @desc    Cancel multiple stock reservations
 * @access  Private
 */
router.post('/reservations/bulk-cancel', async (req, res) => {
    try {
        const { reservation_ids, reason } = req.body;
        
        if (!reservation_ids || !Array.isArray(reservation_ids) || reservation_ids.length === 0) {
            return res.status(400).json({
                message: 'reservation_ids array is required and must not be empty',
                status: 'error'
            });
        }
        
        const results = [];
        const errors = [];
        
        for (const id of reservation_ids) {
            try {
                req.params = { id };
                req.body = { reason };
                
                const mockRes = {
                    json: (data) => {
                        if (data.status === 'success') {
                            results.push({ id, ...data });
                        } else {
                            errors.push({ id, error: data });
                        }
                    },
                    status: (code) => ({
                        json: (data) => {
                            if (code >= 200 && code < 300) {
                                results.push({ id, ...data });
                            } else {
                                errors.push({ id, error: data });
                            }
                        }
                    })
                };
                
                await warehouseController.cancelStockReservation(req, mockRes);
            } catch (error) {
                errors.push({ 
                    id, 
                    error: { 
                        message: error.message, 
                        status: 'error' 
                    } 
                });
            }
        }
        
        res.status(errors.length > 0 ? 207 : 200).json({
            message: `Bulk cancellation completed: ${results.length} success, ${errors.length} errors`,
            successful: results,
            errors: errors,
            total: reservation_ids.length,
            status: errors.length > 0 ? 'partial_success' : 'success'
        });
        
    } catch (error) {
        console.error('Error in bulk reservation cancellation:', error);
        res.status(500).json({
            message: 'Gagal melakukan bulk cancellation',
            error: error.message,
            status: 'error'
        });
    }
});

// ====================================================================
// BATCH PROCESSING ROUTES
// ====================================================================

/**
 * @route   POST /api/warehouse/batch/stock-transfer
 * @desc    Batch stock transfer between locations
 * @access  Private
 */
router.post('/batch/stock-transfer', async (req, res) => {
    try {
        const { from_location_id, to_location_id, items, reference_id, notes } = req.body;
        
        if (!from_location_id || !to_location_id || !items || !Array.isArray(items)) {
            return res.status(400).json({
                message: 'from_location_id, to_location_id, and items array are required',
                status: 'error'
            });
        }
        
        if (from_location_id === to_location_id) {
            return res.status(400).json({
                message: 'Source and destination locations cannot be the same',
                status: 'error'
            });
        }
        
        const results = [];
        const errors = [];
        
        for (const item of items) {
            try {
                const movementData = {
                    part_number: item.part_number,
                    movement_type: 'transfer',
                    from_location_id,
                    to_location_id,
                    quantity: item.quantity,
                    unit_cost: item.unit_cost,
                    reference_type: 'batch_transfer',
                    reference_id: reference_id || `BATCH-${Date.now()}`,
                    notes: notes || `Batch transfer: ${item.part_number}`,
                    batch_number: item.batch_number,
                    expiry_date: item.expiry_date,
                    serial_numbers: item.serial_numbers
                };
                
                req.body = movementData;
                const mockRes = {
                    status: (code) => ({
                        json: (data) => {
                            if (code >= 200 && code < 300) {
                                results.push({ part_number: item.part_number, ...data });
                            } else {
                                errors.push({ part_number: item.part_number, error: data });
                            }
                        }
                    })
                };
                
                await warehouseController.createInventoryMovement(req, mockRes);
            } catch (error) {
                errors.push({ 
                    part_number: item.part_number, 
                    error: { 
                        message: error.message, 
                        status: 'error' 
                    } 
                });
            }
        }
        
        res.status(errors.length > 0 ? 207 : 201).json({
            message: `Batch transfer completed: ${results.length} success, ${errors.length} errors`,
            successful: results,
            errors: errors,
            total: items.length,
            from_location_id,
            to_location_id,
            status: errors.length > 0 ? 'partial_success' : 'success'
        });
        
    } catch (error) {
        console.error('Error in batch stock transfer:', error);
        res.status(500).json({
            message: 'Gagal melakukan batch stock transfer',
            error: error.message,
            status: 'error'
        });
    }
});

/**
 * @route   POST /api/warehouse/batch/adjustments
 * @desc    Batch inventory adjustments
 * @access  Private
 */
router.post('/batch/adjustments', async (req, res) => {
    try {
        const { location_id, adjustments, reference_id, reason_code, notes } = req.body;
        
        if (!location_id || !adjustments || !Array.isArray(adjustments)) {
            return res.status(400).json({
                message: 'location_id and adjustments array are required',
                status: 'error'
            });
        }
        
        const results = [];
        const errors = [];
        
        for (const adjustment of adjustments) {
            try {
                const adjustmentQuantity = adjustment.adjustment_quantity;
                const movementData = {
                    part_number: adjustment.part_number,
                    movement_type: 'adjustment',
                    to_location_id: adjustmentQuantity > 0 ? location_id : null,
                    from_location_id: adjustmentQuantity < 0 ? location_id : null,
                    quantity: Math.abs(adjustmentQuantity),
                    unit_cost: adjustment.unit_cost,
                    reference_type: 'batch_adjustment',
                    reference_id: reference_id || `ADJ-${Date.now()}`,
                    reason_code: reason_code || adjustment.reason_code || 'inventory_adjustment',
                    notes: notes || adjustment.notes || `Batch adjustment: ${adjustment.part_number}`
                };
                
                req.body = movementData;
                const mockRes = {
                    status: (code) => ({
                        json: (data) => {
                            if (code >= 200 && code < 300) {
                                results.push({ 
                                    part_number: adjustment.part_number, 
                                    adjustment_quantity: adjustmentQuantity,
                                    ...data 
                                });
                            } else {
                                errors.push({ 
                                    part_number: adjustment.part_number, 
                                    adjustment_quantity: adjustmentQuantity,
                                    error: data 
                                });
                            }
                        }
                    })
                };
                
                await warehouseController.createInventoryMovement(req, mockRes);
            } catch (error) {
                errors.push({ 
                    part_number: adjustment.part_number,
                    adjustment_quantity: adjustment.adjustment_quantity,
                    error: { 
                        message: error.message, 
                        status: 'error' 
                    } 
                });
            }
        }
        
        res.status(errors.length > 0 ? 207 : 201).json({
            message: `Batch adjustments completed: ${results.length} success, ${errors.length} errors`,
            successful: results,
            errors: errors,
            total: adjustments.length,
            location_id,
            status: errors.length > 0 ? 'partial_success' : 'success'
        });
        
    } catch (error) {
        console.error('Error in batch adjustments:', error);
        res.status(500).json({
            message: 'Gagal melakukan batch adjustments',
            error: error.message,
            status: 'error'
        });
    }
});

// ====================================================================
// ERROR HANDLING
// ====================================================================

// Global error handler for warehouse routes
router.use((error, req, res, next) => {
    console.error('Warehouse Route Error:', error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            errors: error.details || error.message,
            status: 'validation_error'
        });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            message: 'Duplicate entry detected',
            field: error.errors?.[0]?.path,
            status: 'duplicate_error'
        });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            message: 'Referenced record not found',
            field: error.fields,
            status: 'reference_error'
        });
    }
    
    res.status(500).json({
        message: 'Internal server error in warehouse operations',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
        status: 'error'
    });
});

module.exports = router;
