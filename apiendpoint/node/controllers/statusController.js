const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

// Controller untuk mencari status barang berdasarkan job order
exports.getItemStatus = async (req, res) => {
    try {
        const { lot_number } = req.params; // job_order parameter
        
        if (!lot_number) {
            return res.status(400).json({
                message: 'Job order harus disediakan',
                error: 'job_order parameter is required'
            });
        }

        // Query untuk mencari production order berdasarkan job order
        const [productionOrder] = await sequelize.query(
            `SELECT 
                po.id,
                po.job_order,
                po.part_number,
                po.plan_quantity,
                po.machine_name,
                po.status as production_status,
                po.workflow_status,
                po.start_date,
                po.created_at as order_created_at,
                po.updated_at
            FROM production_orders po
            WHERE po.job_order = ?`,
            {
                replacements: [lot_number],
                type: QueryTypes.SELECT
            }
        );

        if (!productionOrder) {
            return res.status(404).json({
                message: 'Job order tidak ditemukan',
                job_order: lot_number
            });
        }

        // Query untuk mencari output mesin terkait
        const machineOutputs = await sequelize.query(
            `SELECT 
                om.id,
                om.job_order,
                om.actual_quantity,
                om.ng_quantity,
                om.shift,
                om.operation_date,
                om.created_at
            FROM output_mc om
            WHERE om.job_order = ?
            ORDER BY om.created_at DESC`,
            {
                replacements: [lot_number],
                type: QueryTypes.SELECT
            }
        );

        // Query untuk mencari transfer QC terkait
        const qcTransfers = await sequelize.query(
            `SELECT 
                tq.id,
                tq.job_order,
                tq.transfer_quantity,
                tq.transfer_date,
                tq.qc_location,
                tq.remarks,
                tq.created_at
            FROM transfer_qc tq
            WHERE tq.job_order = ?
            ORDER BY tq.created_at DESC`,
            {
                replacements: [lot_number],
                type: QueryTypes.SELECT
            }
        );

        // Query untuk mencari data OQC terkait
        const oqcRecords = await sequelize.query(
            `SELECT 
                oqc.id,
                oqc.job_order,
                oqc.oqc_quantity,
                oqc.ng_quantity,
                oqc.oqc_result,
                oqc.oqc_date,
                oqc.remarks,
                oqc.created_at
            FROM oqc oqc
            WHERE oqc.job_order = ?
            ORDER BY oqc.created_at DESC`,
            {
                replacements: [lot_number],
                type: QueryTypes.SELECT
            }
        );

        // Query untuk mencari delivery terkait
        const deliveries = await sequelize.query(
            `SELECT 
                d.id,
                d.delivery_order,
                d.job_order,
                d.delivery_quantity,
                d.delivery_date,
                d.customer_name,
                d.remarks,
                d.created_at
            FROM delivery d
            WHERE d.job_order = ?
            ORDER BY d.created_at DESC`,
            {
                replacements: [lot_number],
                type: QueryTypes.SELECT
            }
        );

        // Query untuk mencari return terkait
        const returns = await sequelize.query(
            `SELECT 
                r.id,
                r.return_number,
                r.job_order,
                r.return_quantity,
                r.return_date,
                r.return_reason,
                r.customer_name,
                r.created_at
            FROM return_customer r
            WHERE r.job_order = ?
            ORDER BY r.created_at DESC`,
            {
                replacements: [lot_number],
                type: QueryTypes.SELECT
            }
        );

        // Hitung total quantities untuk summary
        const totalProduced = machineOutputs.reduce((sum, output) => sum + parseFloat(output.actual_quantity || 0), 0);
        const totalNG = machineOutputs.reduce((sum, output) => sum + parseFloat(output.ng_quantity || 0), 0);
        const totalTransferred = qcTransfers.reduce((sum, transfer) => sum + parseFloat(transfer.transfer_quantity || 0), 0);
        const totalOQC = oqcRecords.reduce((sum, oqc) => sum + parseFloat(oqc.oqc_quantity || 0), 0);
        const totalDelivered = deliveries.reduce((sum, delivery) => sum + parseFloat(delivery.delivery_quantity || 0), 0);
        const totalReturned = returns.reduce((sum, returnItem) => sum + parseFloat(returnItem.return_quantity || 0), 0);

        // Tentukan status keseluruhan
        let overallStatus = 'UNKNOWN';
        let statusColor = 'gray';
        
        if (productionOrder.production_status === 'cancelled') {
            overallStatus = 'CANCELLED';
            statusColor = 'red';
        } else if (productionOrder.production_status === 'completed') {
            overallStatus = 'COMPLETED';
            statusColor = 'green';
        } else if (deliveries.length > 0) {
            overallStatus = 'DELIVERED';
            statusColor = 'blue';
        } else if (oqcRecords.length > 0) {
            overallStatus = 'QC_COMPLETED';
            statusColor = 'lightblue';
        } else if (qcTransfers.length > 0) {
            overallStatus = 'IN_QC';
            statusColor = 'yellow';
        } else if (machineOutputs.length > 0) {
            overallStatus = 'IN_PRODUCTION';
            statusColor = 'orange';
        } else {
            overallStatus = 'PLANNED';
            statusColor = 'purple';
        }

        // Progress percentage
        const progressPercentage = productionOrder.plan_quantity > 0 
            ? Math.round((totalProduced / productionOrder.plan_quantity) * 100)
            : 0;

        const response = {
            job_order: lot_number,
            found: true,
            overall_status: overallStatus,
            status_color: statusColor,
            progress_percentage: progressPercentage,
            production_order: productionOrder,
            summary: {
                target_quantity: parseFloat(productionOrder.plan_quantity),
                total_produced: totalProduced,
                total_ng: totalNG,
                total_transferred_to_qc: totalTransferred,
                total_oqc_checked: totalOQC,
                total_delivered: totalDelivered,
                total_returned: totalReturned,
                balance_wip: totalProduced - totalTransferred,
                balance_fg: totalOQC - totalDelivered
            },
            timeline: {
                machine_outputs: machineOutputs,
                qc_transfers: qcTransfers,
                oqc_records: oqcRecords,
                deliveries: deliveries,
                returns: returns
            },
            last_activity: getLastActivity(machineOutputs, qcTransfers, oqcRecords, deliveries, returns)
        };

        res.status(200).json({
            message: 'Status barang berhasil ditemukan',
            data: response
        });

    } catch (error) {
        console.error('Error getting item status:', error);
        res.status(500).json({
            message: 'Gagal mengambil status barang',
            error: error.message
        });
    }
};

// Controller untuk mencari berdasarkan part number (alternatif)
exports.getItemStatusByPartNumber = async (req, res) => {
    try {
        const { part_number } = req.params;
        const { limit = 10 } = req.query;
        
        if (!part_number) {
            return res.status(400).json({
                message: 'Part number harus disediakan',
                error: 'part_number parameter is required'
            });
        }

        // Query untuk mencari semua production order dengan part number tersebut
        const productionOrders = await sequelize.query(
            `SELECT 
                po.id,
                po.job_order,
                po.part_number,
                po.plan_quantity,
                po.machine_name,
                po.status as production_status,
                po.workflow_status,
                po.created_at
            FROM production_orders po
            WHERE po.part_number = ?
            ORDER BY po.created_at DESC
            LIMIT ?`,
            {
                replacements: [part_number, parseInt(limit)],
                type: QueryTypes.SELECT
            }
        );

        if (productionOrders.length === 0) {
            return res.status(404).json({
                message: 'Part number tidak ditemukan dalam production orders',
                part_number: part_number
            });
        }

        res.status(200).json({
            message: 'Data production orders berhasil ditemukan',
            part_number: part_number,
            total_orders: productionOrders.length,
            data: productionOrders
        });

    } catch (error) {
        console.error('Error getting item status by part number:', error);
        res.status(500).json({
            message: 'Gagal mengambil status barang berdasarkan part number',
            error: error.message
        });
    }
};

// Helper function untuk mendapatkan aktivitas terakhir
function getLastActivity(machineOutputs, qcTransfers, oqcRecords, deliveries, returns) {
    const allActivities = [];
    
    machineOutputs.forEach(output => {
        allActivities.push({
            type: 'PRODUCTION',
            date: output.created_at,
            description: `Produksi shift ${output.shift}: ${output.actual_quantity} Good, ${output.ng_quantity} NG`
        });
    });
    
    qcTransfers.forEach(transfer => {
        allActivities.push({
            type: 'QC_TRANSFER',
            date: transfer.created_at,
            description: `Transfer ke QC: ${transfer.transfer_quantity} pcs ke ${transfer.qc_location}`
        });
    });
    
    oqcRecords.forEach(oqc => {
        allActivities.push({
            type: 'QC_CHECK',
            date: oqc.created_at,
            description: `OQC Result: ${oqc.oqc_result} - ${oqc.oqc_quantity} checked, ${oqc.ng_quantity} NG`
        });
    });
    
    deliveries.forEach(delivery => {
        allActivities.push({
            type: 'DELIVERY',
            date: delivery.created_at,
            description: `Delivery ${delivery.delivery_order}: ${delivery.delivery_quantity} pcs ke ${delivery.customer_name}`
        });
    });
    
    returns.forEach(returnItem => {
        allActivities.push({
            type: 'RETURN',
            date: returnItem.created_at,
            description: `Return ${returnItem.return_number}: ${returnItem.return_quantity} pcs - ${returnItem.return_reason}`
        });
    });
    
    // Sort by date descending and return the latest
    allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allActivities.length > 0 ? allActivities[0] : null;
}

// Controller untuk search job orders (autocomplete/suggestions)
exports.searchLotNumbers = async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({
                message: 'Query pencarian minimal 2 karakter',
                error: 'Search query too short'
            });
        }

        const jobOrders = await sequelize.query(
            `SELECT 
                job_order,
                part_number,
                status,
                workflow_status,
                created_at
            FROM production_orders po
            WHERE job_order LIKE ? OR part_number LIKE ?
            ORDER BY created_at DESC
            LIMIT ?`,
            {
                replacements: [`%${query}%`, `%${query}%`, parseInt(limit)],
                type: QueryTypes.SELECT
            }
        );

        res.status(200).json({
            message: 'Pencarian job order berhasil',
            query: query,
            results: jobOrders.length,
            data: jobOrders
        });

    } catch (error) {
        console.error('Error searching job orders:', error);
        res.status(500).json({
            message: 'Gagal mencari job orders',
            error: error.message
        });
    }
};
