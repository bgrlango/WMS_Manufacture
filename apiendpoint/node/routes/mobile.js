/**
 * Mobile API Routes for Command Service (Node.js)
 * Simplified mobile endpoints for write operations
 */
const express = require('express');
const router = express.Router();

// Mobile health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Mobile API Command Service',
        timestamp: new Date().toISOString(),
        device: req.isMobile ? 'mobile' : 'desktop',
        deviceId: req.deviceId,
        appVersion: req.appVersion
    });
});

// Mobile service info
router.get('/info', (req, res) => {
    res.json({
        service: 'Mobile API Command Service',
        version: '1.0.0',
        description: 'Mobile-optimized write operations for Manufacturing ERP',
        capabilities: [
            'Production output entry',
            'Quality control inspection',
            'Inventory movement recording',
            'Mobile authentication'
        ],
        supportedDevices: ['Android', 'iOS', 'PWA'],
        optimization: {
            compression: true,
            responseOptimization: req.isMobile,
            rateLimit: '100 requests per minute'
        }
    });
});

// Mobile production output (simplified)
router.post('/production/output', (req, res) => {
    try {
        const { machineId, shiftId, outputQuantity, defectQuantity } = req.body;
        
        // Basic validation
        if (!machineId || !outputQuantity) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['machineId', 'outputQuantity']
            });
        }

        // Mock response for now (integrate with actual DB later)
        res.json({
            success: true,
            message: 'Production output recorded successfully',
            data: {
                recordId: Date.now(),
                machineId,
                outputQuantity,
                defectQuantity: defectQuantity || 0,
                timestamp: new Date().toISOString(),
                deviceInfo: {
                    isMobile: req.isMobile,
                    deviceId: req.deviceId
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

// Mobile QC inspection (simplified)
router.post('/quality-control/inspection', (req, res) => {
    try {
        const { productionOrderId, inspectionResult, defectType } = req.body;
        
        if (!productionOrderId || !inspectionResult) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['productionOrderId', 'inspectionResult']
            });
        }

        res.json({
            success: true,
            message: 'QC inspection recorded successfully',
            data: {
                inspectionId: Date.now(),
                productionOrderId,
                inspectionResult,
                defectType: defectType || null,
                timestamp: new Date().toISOString(),
                deviceInfo: {
                    isMobile: req.isMobile,
                    deviceId: req.deviceId
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

// Mobile warehouse movement (simplified)
router.post('/warehouse/movement', (req, res) => {
    try {
        const { productId, fromLocation, toLocation, quantity, movementType } = req.body;
        
        if (!productId || !quantity || !movementType) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['productId', 'quantity', 'movementType']
            });
        }

        res.json({
            success: true,
            message: 'Inventory movement recorded successfully',
            data: {
                movementId: Date.now(),
                productId,
                fromLocation,
                toLocation,
                quantity,
                movementType,
                timestamp: new Date().toISOString(),
                deviceInfo: {
                    isMobile: req.isMobile,
                    deviceId: req.deviceId
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

module.exports = router;
