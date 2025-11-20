// ====================================================================
// ENHANCED PRODUCTION CONTROLLER - FULL ERP INTEGRATION
// File: backend/node/controllers/productionController_enhanced.js
// Purpose: Production management dengan integrasi ERP lengkap
// Date: 2025-08-27
// ====================================================================

const { ProductionOrder, OutputMc } = require('../models');
const { 
    Machine, 
    ProductionSchedule, 
    InventoryMovement, 
    InventoryBalance, 
    InventoryLocation,
    BillOfMaterials,
    WorkflowState,
    SystemConfiguration 
} = require('../models/erpModels');
const { Op, Transaction } = require('sequelize');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/**
 * Fungsi helper untuk membuat nomor Job Order unik secara harian.
 * Format: JO-YYYYMMDD-XXXX (contoh: JO-20250827-0001)
 */
const generateJobOrder = async (transaction) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}`;
    const prefix = `JO-${datePart}-`;

    const [lastOrder] = await sequelize.query(
        'SELECT job_order FROM production_orders WHERE job_order LIKE ? ORDER BY job_order DESC LIMIT 1 FOR UPDATE',
        {
            replacements: [`${prefix}%`],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    let nextSequence = 1;
    if (lastOrder) {
        const lastSequenceNumber = parseInt(lastOrder.job_order.split('-').pop(), 10);
        nextSequence = lastSequenceNumber + 1;
    }

    const sequencePart = nextSequence.toString().padStart(4, '0');
    return `${prefix}${sequencePart}`;
};

/**
 * Generate schedule number untuk production schedule
 */
const generateScheduleNumber = async (transaction) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    const datePart = `${year}${month}${day}`;
    const prefix = `SCH-${datePart}-`;

    const [lastSchedule] = await sequelize.query(
        'SELECT schedule_number FROM production_schedules WHERE schedule_number LIKE ? ORDER BY schedule_number DESC LIMIT 1 FOR UPDATE',
        {
            replacements: [`${prefix}%`],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    let nextSequence = 1;
    if (lastSchedule) {
        const lastSequenceNumber = parseInt(lastSchedule.schedule_number.split('-').pop(), 10);
        nextSequence = lastSequenceNumber + 1;
    }

    const sequencePart = nextSequence.toString().padStart(4, '0');
    return `${prefix}${sequencePart}`;
};

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
 * Update workflow state untuk entity
 */
const updateWorkflowState = async (entityType, entityId, newState, previousState, userId, transaction, notes = null) => {
    const workflowName = `${entityType}_workflow`;
    
    // Deactivate current state
    await sequelize.query(
        'UPDATE workflow_states SET is_active = FALSE WHERE entity_type = ? AND entity_id = ? AND workflow_name = ? AND is_active = TRUE',
        {
            replacements: [entityType, entityId, workflowName],
            type: QueryTypes.UPDATE,
            transaction
        }
    );

    // Create new state
    await sequelize.query(
        'INSERT INTO workflow_states (entity_type, entity_id, workflow_name, current_state, previous_state, changed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        {
            replacements: [entityType, entityId, workflowName, newState, previousState, userId, notes],
            type: QueryTypes.INSERT,
            transaction
        }
    );
};

/**
 * Record inventory movement
 */
const recordInventoryMovement = async (transaction, data) => {
    const {
        partNumber,
        movementType,
        fromLocationId,
        toLocationId,
        quantity,
        unitCost,
        referenceType,
        referenceId,
        reasonCode,
        notes,
        userId
    } = data;

    const movementNumber = await generateMovementNumber(transaction, movementType);

    await sequelize.query(
        `INSERT INTO inventory_movements 
         (movement_number, part_number, movement_type, from_location_id, to_location_id, 
          quantity, unit_cost, reference_type, reference_id, reason_code, notes, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
            replacements: [
                movementNumber, partNumber, movementType, fromLocationId, toLocationId,
                quantity, unitCost, referenceType, referenceId, reasonCode, notes, userId
            ],
            type: QueryTypes.INSERT,
            transaction
        }
    );

    return movementNumber;
};

/**
 * Update inventory balance setelah movement
 */
const updateInventoryBalance = async (transaction, partNumber, locationId, quantityChange, operation = 'add') => {
    const operator = operation === 'add' ? '+' : '-';
    
    // Check if balance record exists
    const [existingBalance] = await sequelize.query(
        'SELECT id FROM inventory_balances WHERE part_number = ? AND location_id = ?',
        {
            replacements: [partNumber, locationId],
            type: QueryTypes.SELECT,
            transaction
        }
    );

    if (existingBalance) {
        // Update existing balance
        await sequelize.query(
            `UPDATE inventory_balances 
             SET available_quantity = available_quantity ${operator} ?, 
                 last_movement_date = NOW() 
             WHERE part_number = ? AND location_id = ?`,
            {
                replacements: [Math.abs(quantityChange), partNumber, locationId],
                type: QueryTypes.UPDATE,
                transaction
            }
        );
    } else {
        // Create new balance record
        const initialQuantity = operation === 'add' ? quantityChange : 0;
        await sequelize.query(
            `INSERT INTO inventory_balances 
             (part_number, location_id, available_quantity, last_movement_date) 
             VALUES (?, ?, ?, NOW())`,
            {
                replacements: [partNumber, locationId, initialQuantity],
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
 * CREATE PRODUCTION ORDER dengan ERP Integration
 * Features:
 * - Auto job order generation
 * - Machine scheduling
 * - Material reservation
 * - Workflow state tracking
 */
const createProductionOrder = async (req, res) => {
    const t = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE });
    
    try {
        const { 
            part_number, 
            plan_quantity, 
            machine_code,
            start_date,
            priority = 5,
            estimated_runtime_hours,
            operator_id,
            notes 
        } = req.body;

        // Validate required fields
        if (!part_number || plan_quantity === undefined || !start_date) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'Field part_number, plan_quantity, dan start_date wajib diisi.' 
            });
        }

        const userId = req.user.id;

        // 1. Generate job order
        const newJobOrder = await generateJobOrder(t);

        // 2. Find machine if specified
        let machineId = null;
        let machineName = null;
        if (machine_code) {
            const [machine] = await sequelize.query(
                'SELECT id, machine_name FROM machines WHERE machine_code = ? AND is_active = TRUE',
                {
                    replacements: [machine_code],
                    type: QueryTypes.SELECT,
                    transaction: t
                }
            );

            if (!machine) {
                await t.rollback();
                return res.status(400).json({ 
                    message: `Machine dengan kode ${machine_code} tidak ditemukan atau tidak aktif.` 
                });
            }

            machineId = machine.id;
            machineName = machine.machine_name;
        }

        // 3. Create production order
        console.log('Debug production order params:', {
            newJobOrder, part_number, plan_quantity, machineName, start_date
        });
        
        const [productionOrderId] = await sequelize.query(
            `INSERT INTO production_orders 
             (job_order, part_number, plan_quantity, machine_name, start_date, status, workflow_status, created_at) 
             VALUES (?, ?, ?, ?, ?, 'running', 'planning', NOW())`,
            {
                replacements: [newJobOrder, part_number, plan_quantity, machineName || null, start_date],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );

        // 4. Create production schedule if machine specified
        let scheduleId = null;
        if (machineId && estimated_runtime_hours) {
            const scheduleNumber = await generateScheduleNumber(t);
            const scheduledStart = new Date(start_date);
            const scheduledEnd = new Date(scheduledStart.getTime() + (estimated_runtime_hours * 60 * 60 * 1000));

            // Debug parameters
            console.log('Schedule parameters:', {
                scheduleNumber, productionOrderId, machineId, operator_id, 
                scheduledStart, scheduledEnd, priority, 
                estimated_runtime_minutes: estimated_runtime_hours * 60, notes, userId
            });

            const [scheduleResult] = await sequelize.query(
                `INSERT INTO production_schedules 
                 (schedule_number, production_order_id, machine_id, operator_id, scheduled_start, scheduled_end, 
                  priority, estimated_runtime_minutes, notes, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                {
                    replacements: [
                        scheduleNumber, productionOrderId, machineId, operator_id || null,
                        scheduledStart, scheduledEnd, priority, 
                        estimated_runtime_hours * 60, notes, userId
                    ],
                    type: QueryTypes.INSERT,
                    transaction: t
                }
            );
            scheduleId = scheduleResult;
        }

        // 5. Initialize workflow state
        await updateWorkflowState(
            'production_order', 
            productionOrderId, 
            'planning', 
            null, 
            userId, 
            t, 
            'Production order created'
        );

        // 6. Check and reserve materials (if BOM exists)
        const bomItems = await sequelize.query(
            'SELECT child_part_number, quantity_required FROM bill_of_materials WHERE parent_part_number = ? AND is_active = TRUE',
            {
                replacements: [part_number],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        let materialReservations = [];
        for (const bomItem of bomItems) {
            const requiredQty = bomItem.quantity_required * plan_quantity;
            
            // Check available stock
            const [stockInfo] = await sequelize.query(
                `SELECT SUM(available_quantity) as total_available 
                 FROM inventory_balances ib 
                 JOIN inventory_locations il ON ib.location_id = il.id 
                 WHERE ib.part_number = ? AND il.location_type = 'raw_material'`,
                {
                    replacements: [bomItem.child_part_number],
                    type: QueryTypes.SELECT,
                    transaction: t
                }
            );

            const availableQty = stockInfo?.total_available || 0;
            
            materialReservations.push({
                part_number: bomItem.child_part_number,
                required_quantity: requiredQty,
                available_quantity: availableQty,
                can_fulfill: availableQty >= requiredQty
            });

            // Reserve material if available
            if (availableQty >= requiredQty) {
                // Find best location to reserve from
                const [locations] = await sequelize.query(
                    `SELECT ib.location_id, ib.available_quantity, il.location_code 
                     FROM inventory_balances ib 
                     JOIN inventory_locations il ON ib.location_id = il.id 
                     WHERE ib.part_number = ? AND il.location_type = 'raw_material' 
                     AND ib.available_quantity > 0 
                     ORDER BY ib.available_quantity DESC LIMIT 1`,
                    {
                        replacements: [bomItem.child_part_number],
                        type: QueryTypes.SELECT,
                        transaction: t
                    }
                );

                if (locations) {
                    // Update reservation
                    await sequelize.query(
                        `UPDATE inventory_balances 
                         SET available_quantity = available_quantity - ?, 
                             reserved_quantity = reserved_quantity + ? 
                         WHERE part_number = ? AND location_id = ?`,
                        {
                            replacements: [requiredQty, requiredQty, bomItem.child_part_number, locations.location_id],
                            type: QueryTypes.UPDATE,
                            transaction: t
                        }
                    );

                    // Record movement
                    await recordInventoryMovement(t, {
                        partNumber: bomItem.child_part_number,
                        movementType: 'out',
                        fromLocationId: locations.location_id,
                        toLocationId: null,
                        quantity: requiredQty,
                        unitCost: null, // Will be calculated from average cost
                        referenceType: 'production',
                        referenceId: productionOrderId,
                        reasonCode: 'MATERIAL_RESERVATION',
                        notes: `Material reserved for job order ${newJobOrder}`,
                        userId: userId
                    });
                }
            }
        }

        // 7. Get created production order details
        const [newOrder] = await sequelize.query(
            `SELECT po.*, ps.schedule_number, ps.scheduled_start, ps.scheduled_end, m.machine_code, m.machine_name as machine_full_name
             FROM production_orders po 
             LEFT JOIN production_schedules ps ON po.id = ps.production_order_id 
             LEFT JOIN machines m ON ps.machine_id = m.id 
             WHERE po.id = ?`,
            {
                replacements: [productionOrderId],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        // Commit transaction
        await t.commit();
        
        res.status(201).json({
            message: 'Production Order dengan ERP integration berhasil dibuat',
            data: {
                production_order: newOrder,
                schedule_id: scheduleId,
                material_reservations: materialReservations,
                workflow_state: 'planning'
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error saat membuat Production Order ERP:', error);
        res.status(500).json({ 
            message: 'Gagal membuat Production Order', 
            error: error.message 
        });
    }
};

/**
 * START PRODUCTION - Memulai produksi dengan update machine schedule
 */
const startProduction = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { job_order } = req.body;
        const userId = req.user.id;

        if (!job_order) {
            await t.rollback();
            return res.status(400).json({ message: 'job_order wajib diisi.' });
        }

        // 1. Get production order
        const [productionOrder] = await sequelize.query(
            'SELECT * FROM production_orders WHERE job_order = ?',
            {
                replacements: [job_order],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!productionOrder) {
            await t.rollback();
            return res.status(404).json({ message: 'Production order tidak ditemukan.' });
        }

        // 2. Update production order workflow
        await sequelize.query(
            'UPDATE production_orders SET workflow_status = ? WHERE job_order = ?',
            {
                replacements: ['in_production', job_order],
                type: QueryTypes.UPDATE,
                transaction: t
            }
        );

        // 3. Update production schedule if exists
        await sequelize.query(
            'UPDATE production_schedules SET status = ?, actual_start = NOW() WHERE production_order_id = ?',
            {
                replacements: ['in_progress', productionOrder.id],
                type: QueryTypes.UPDATE,
                transaction: t
            }
        );

        // 4. Update workflow state
        await updateWorkflowState(
            'production_order', 
            productionOrder.id, 
            'in_production', 
            'planning', 
            userId, 
            t, 
            'Production started'
        );

        await t.commit();

        res.status(200).json({
            message: 'Produksi berhasil dimulai',
            data: {
                job_order: job_order,
                workflow_status: 'in_production',
                started_at: new Date()
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error starting production:', error);
        res.status(500).json({ 
            message: 'Gagal memulai produksi', 
            error: error.message 
        });
    }
};

/**
 * CREATE OUTPUT MC dengan ERP Integration
 * Features:
 * - Inventory movement tracking
 * - WIP location management
 * - Production progress tracking
 */
const createOutputMc = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { 
            job_order,
            actual_quantity,
            ng_quantity = 0,
            shift,
            operation_date,
            wip_location_code = 'WH-WIP-B01'
        } = req.body;
        
        if (!job_order || actual_quantity === undefined || !shift || !operation_date) {
            await t.rollback();
            return res.status(400).json({ 
                message: 'Field job_order, actual_quantity, shift, dan operation_date wajib diisi.' 
            });
        }

        const userId = req.user.id;

        // 1. Get production order info
        const [productionOrder] = await sequelize.query(
            'SELECT * FROM production_orders WHERE job_order = ?',
            {
                replacements: [job_order],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!productionOrder) {
            await t.rollback();
            return res.status(404).json({ message: 'Production order tidak ditemukan.' });
        }

        // 2. Get WIP location
        const [wipLocation] = await sequelize.query(
            'SELECT id FROM inventory_locations WHERE location_code = ? AND location_type = ?',
            {
                replacements: [wip_location_code, 'wip'],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        if (!wipLocation) {
            await t.rollback();
            return res.status(400).json({ 
                message: `WIP location ${wip_location_code} tidak ditemukan.` 
            });
        }

        // 3. Create output MC record
        const [outputId] = await sequelize.query(
            'INSERT INTO output_mc (job_order, actual_quantity, ng_quantity, shift, operation_date, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            {
                replacements: [job_order, actual_quantity, ng_quantity, shift, operation_date],
                type: QueryTypes.INSERT,
                transaction: t
            }
        );

        // 4. Record inventory movement untuk barang jadi masuk WIP
        if (actual_quantity > 0) {
            await recordInventoryMovement(t, {
                partNumber: productionOrder.part_number,
                movementType: 'in',
                fromLocationId: null,
                toLocationId: wipLocation.id,
                quantity: actual_quantity,
                unitCost: null, // Will be calculated from production cost
                referenceType: 'production',
                referenceId: outputId,
                reasonCode: 'PRODUCTION_OUTPUT',
                notes: `Production output for ${job_order} - shift ${shift}`,
                userId: userId
            });

            // Update inventory balance
            await updateInventoryBalance(t, productionOrder.part_number, wipLocation.id, actual_quantity, 'add');
        }

        // 5. Record NG movement jika ada (ke scrap location)
        if (ng_quantity > 0) {
            await recordInventoryMovement(t, {
                partNumber: productionOrder.part_number,
                movementType: 'scrap',
                fromLocationId: null,
                toLocationId: wipLocation.id,
                quantity: ng_quantity,
                unitCost: null, // NG products have no cost value
                referenceType: 'production',
                referenceId: outputId,
                reasonCode: 'PRODUCTION_SCRAP',
                notes: `NG/Scrap from ${job_order} - shift ${shift}`,
                userId: userId
            });
        }

        // 6. Check completion status
        const [totalProduced] = await sequelize.query(
            'SELECT SUM(actual_quantity) as total FROM output_mc WHERE job_order = ?',
            {
                replacements: [job_order],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );

        const completionPercentage = (totalProduced.total / productionOrder.plan_quantity) * 100;

        // 7. Update workflow if production is complete
        if (completionPercentage >= 100) {
            await sequelize.query(
                'UPDATE production_orders SET workflow_status = ? WHERE job_order = ?',
                {
                    replacements: ['qc_pending', job_order],
                    type: QueryTypes.UPDATE,
                    transaction: t
                }
            );

            await updateWorkflowState(
                'production_order', 
                productionOrder.id, 
                'qc_pending', 
                'in_production', 
                userId, 
                t, 
                'Production completed, ready for QC'
            );
        }

        // 8. Get created output details
        const [newOutput] = await sequelize.query(
            'SELECT * FROM output_mc WHERE id = ?',
            {
                replacements: [outputId],
                type: QueryTypes.SELECT,
                transaction: t
            }
        );
        
        await t.commit();
        
        res.status(201).json({
            message: 'Data output mesin dengan ERP tracking berhasil dibuat',
            data: {
                output_mc: newOutput,
                completion_percentage: Math.round(completionPercentage),
                workflow_status: completionPercentage >= 100 ? 'qc_pending' : 'in_production',
                inventory_location: wip_location_code
            }
        });
        
    } catch (error) {
        await t.rollback();
        console.error('Error creating output MC ERP:', error);
        res.status(500).json({ 
            message: 'Gagal membuat data output mesin', 
            error: error.message 
        });
    }
};

/**
 * GET PRODUCTION DASHBOARD dengan ERP metrics
 */
const getProductionDashboard = async (req, res) => {
    try {
        // Production orders dengan machine dan schedule info
        const productionOrders = await sequelize.query(
            `SELECT 
                po.id, po.job_order, po.part_number, po.plan_quantity, 
                po.start_date, po.status, po.workflow_status,
                ps.schedule_number, ps.scheduled_start, ps.scheduled_end, 
                ps.actual_start, ps.actual_end, ps.status as schedule_status,
                m.machine_code, m.machine_name, m.status as machine_status,
                COALESCE(SUM(om.actual_quantity), 0) as total_produced,
                COALESCE(SUM(om.ng_quantity), 0) as total_ng,
                CASE 
                    WHEN po.plan_quantity > 0 THEN 
                        ROUND((COALESCE(SUM(om.actual_quantity), 0) / po.plan_quantity) * 100, 2)
                    ELSE 0 
                END as completion_percentage
             FROM production_orders po
             LEFT JOIN production_schedules ps ON po.id = ps.production_order_id
             LEFT JOIN machines m ON ps.machine_id = m.id
             LEFT JOIN output_mc om ON po.job_order = om.job_order
             WHERE po.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY po.id, ps.id
             ORDER BY po.created_at DESC`,
            { type: QueryTypes.SELECT }
        );

        // Machine utilization
        const machineUtilization = await sequelize.query(
            `SELECT 
                m.machine_code, m.machine_name, m.status,
                COUNT(ps.id) as scheduled_jobs,
                SUM(CASE WHEN ps.status = 'in_progress' THEN 1 ELSE 0 END) as active_jobs,
                AVG(ps.actual_runtime_minutes) as avg_runtime_minutes
             FROM machines m
             LEFT JOIN production_schedules ps ON m.id = ps.machine_id 
                AND ps.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             WHERE m.is_active = TRUE
             GROUP BY m.id`,
            { type: QueryTypes.SELECT }
        );

        // Inventory levels WIP
        const wipInventory = await sequelize.query(
            `SELECT 
                ib.part_number,
                il.location_code, il.location_name,
                ib.available_quantity, ib.reserved_quantity,
                ib.last_movement_date
             FROM inventory_balances ib
             JOIN inventory_locations il ON ib.location_id = il.id
             WHERE il.location_type = 'wip' AND ib.available_quantity > 0
             ORDER BY ib.last_movement_date DESC`,
            { type: QueryTypes.SELECT }
        );

        // Recent inventory movements
        const recentMovements = await sequelize.query(
            `SELECT 
                im.movement_number, im.part_number, im.movement_type,
                im.quantity, im.reference_type, im.movement_date,
                il_from.location_code as from_location,
                il_to.location_code as to_location
             FROM inventory_movements im
             LEFT JOIN inventory_locations il_from ON im.from_location_id = il_from.id
             LEFT JOIN inventory_locations il_to ON im.to_location_id = il_to.id
             WHERE im.movement_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY im.movement_date DESC
             LIMIT 20`,
            { type: QueryTypes.SELECT }
        );

        res.status(200).json({
            message: 'ERP Production Dashboard berhasil dimuat',
            data: {
                production_orders: productionOrders,
                machine_utilization: machineUtilization,
                wip_inventory: wipInventory,
                recent_movements: recentMovements,
                summary: {
                    total_active_orders: productionOrders.filter(o => o.status === 'running').length,
                    total_machines: machineUtilization.length,
                    active_machines: machineUtilization.filter(m => m.active_jobs > 0).length
                }
            }
        });

    } catch (error) {
        console.error('Error loading production dashboard:', error);
        res.status(500).json({ 
            message: 'Gagal memuat production dashboard', 
            error: error.message 
        });
    }
};

/**
 * GET INVENTORY SUMMARY untuk production planning
 */
const getInventorySummary = async (req, res) => {
    try {
        const { location_type, part_number } = req.query;

        let whereClause = 'WHERE il.is_active = TRUE';
        let replacements = [];

        if (location_type) {
            whereClause += ' AND il.location_type = ?';
            replacements.push(location_type);
        }

        if (part_number) {
            whereClause += ' AND ib.part_number LIKE ?';
            replacements.push(`%${part_number}%`);
        }

        const inventorySummary = await sequelize.query(
            `SELECT 
                ib.part_number,
                il.location_code, il.location_name, il.location_type,
                ib.available_quantity, ib.reserved_quantity, ib.quarantine_quantity,
                (ib.available_quantity + ib.reserved_quantity + ib.quarantine_quantity) as total_quantity,
                ib.average_cost,
                (ib.available_quantity * ib.average_cost) as inventory_value,
                ib.last_movement_date, ib.last_count_date
             FROM inventory_balances ib
             JOIN inventory_locations il ON ib.location_id = il.id
             ${whereClause}
             ORDER BY ib.part_number, il.location_type, il.location_code`,
            {
                replacements,
                type: QueryTypes.SELECT
            }
        );

        res.status(200).json({
            message: 'Inventory summary berhasil dimuat',
            data: inventorySummary
        });

    } catch (error) {
        console.error('Error loading inventory summary:', error);
        res.status(500).json({ 
            message: 'Gagal memuat inventory summary', 
            error: error.message 
        });
    }
};

/**
 * GET MACHINE SCHEDULE untuk production planning
 */
const getMachineSchedule = async (req, res) => {
    try {
        const { machine_code, date_from, date_to } = req.query;

        let whereClause = 'WHERE m.is_active = TRUE';
        let replacements = [];

        if (machine_code) {
            whereClause += ' AND m.machine_code = ?';
            replacements.push(machine_code);
        }

        if (date_from) {
            whereClause += ' AND ps.scheduled_start >= ?';
            replacements.push(date_from);
        }

        if (date_to) {
            whereClause += ' AND ps.scheduled_end <= ?';
            replacements.push(date_to);
        }

        const machineSchedule = await sequelize.query(
            `SELECT 
                m.machine_code, m.machine_name, m.machine_type, m.status as machine_status,
                ps.schedule_number, ps.scheduled_start, ps.scheduled_end,
                ps.actual_start, ps.actual_end, ps.status as schedule_status,
                po.job_order, po.part_number, po.plan_quantity,
                ps.priority, ps.estimated_runtime_minutes, ps.actual_runtime_minutes
             FROM machines m
             LEFT JOIN production_schedules ps ON m.id = ps.machine_id
             LEFT JOIN production_orders po ON ps.production_order_id = po.id
             ${whereClause}
             ORDER BY m.machine_code, ps.scheduled_start`,
            {
                replacements,
                type: QueryTypes.SELECT
            }
        );

        res.status(200).json({
            message: 'Machine schedule berhasil dimuat',
            data: machineSchedule
        });

    } catch (error) {
        console.error('Error loading machine schedule:', error);
        res.status(500).json({ 
            message: 'Gagal memuat machine schedule', 
            error: error.message 
        });
    }
};

// ====================================================================
// UPDATE PRODUCTION ORDER
// ====================================================================
const updateProductionOrder = async (req, res) => {
    const { id } = req.params;
    const { status, quantity_planned, planned_start_date, machine_name, notes } = req.body;

    try {
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Check if production order exists
            const [existingOrder] = await sequelize.query(
                'SELECT * FROM production_orders WHERE id = ?',
                {
                    replacements: [id],
                    type: QueryTypes.SELECT,
                    transaction
                }
            );

            if (!existingOrder) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Production order tidak ditemukan',
                    id: id
                });
            }

            // Prepare update data
            const updateData = {};
            if (status) updateData.status = status;
            if (quantity_planned) updateData.plan_quantity = quantity_planned;
            if (planned_start_date) updateData.start_date = planned_start_date;
            if (machine_name) updateData.machine_name = machine_name;
            updateData.updated_at = new Date();

            // Build dynamic update query
            const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updateData);
            updateValues.push(id);

            // Update production order
            await sequelize.query(
                `UPDATE production_orders SET ${updateFields} WHERE id = ?`,
                {
                    replacements: updateValues,
                    type: QueryTypes.UPDATE,
                    transaction
                }
            );

            // Get updated order
            const [updatedOrder] = await sequelize.query(
                'SELECT * FROM production_orders WHERE id = ?',
                {
                    replacements: [id],
                    type: QueryTypes.SELECT,
                    transaction
                }
            );

            await transaction.commit();

            res.json({
                success: true,
                message: 'Production order berhasil diupdate',
                data: {
                    production_order: updatedOrder,
                    changes: updateData,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error updating production order:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate production order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ====================================================================
// DELETE PRODUCTION ORDER
// ====================================================================
const deleteProductionOrder = async (req, res) => {
    const { id } = req.params;

    try {
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Check if production order exists
            const [existingOrder] = await sequelize.query(
                'SELECT * FROM production_orders WHERE id = ?',
                {
                    replacements: [id],
                    type: QueryTypes.SELECT,
                    transaction
                }
            );

            if (!existingOrder) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Production order tidak ditemukan',
                    id: id
                });
            }

            // Check if order has related output records
            const [outputCount] = await sequelize.query(
                'SELECT COUNT(*) as count FROM output_mc WHERE job_order = ?',
                {
                    replacements: [existingOrder.job_order],
                    type: QueryTypes.SELECT,
                    transaction
                }
            );

            if (outputCount.count > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Tidak dapat menghapus production order yang sudah memiliki output',
                    job_order: existingOrder.job_order,
                    output_count: outputCount.count
                });
            }

            // Soft delete - set status to 'cancelled' instead of hard delete
            await sequelize.query(
                'UPDATE production_orders SET status = ?, updated_at = ? WHERE id = ?',
                {
                    replacements: ['cancelled', new Date(), id],
                    type: QueryTypes.UPDATE,
                    transaction
                }
            );

            await transaction.commit();

            res.json({
                success: true,
                message: 'Production order berhasil dibatalkan',
                data: {
                    id: id,
                    job_order: existingOrder.job_order,
                    previous_status: existingOrder.status,
                    new_status: 'cancelled',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error deleting production order:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus production order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    createProductionOrder,
    startProduction,
    createOutputMc,
    updateProductionOrder,
    deleteProductionOrder,
    getProductionDashboard,
    getInventorySummary,
    getMachineSchedule
};
