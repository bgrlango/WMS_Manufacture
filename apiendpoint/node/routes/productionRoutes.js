const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/authMiddleware');

// Safe controller import with error handling
let productionController;
try {
    productionController = require('../controllers/productionController');
    // Handle default exports
    if (productionController && productionController.default) {
        productionController = productionController.default;
    }
} catch (error) {
    console.error('Failed to load productionController:', error.message);
    productionController = {};
}

// Helper function to ensure handlers are functions
const safeHandler = (handler, handlerName) => {
    if (typeof handler === 'function') {
        return handler;
    }
    console.error(`Handler ${handlerName} is not a function, type:`, typeof handler);
    return (req, res) => {
        res.status(500).json({
            error: 'Internal Server Error',
            message: `Handler ${handlerName} is not available`,
            type: typeof handler
        });
    };
};

// ====================================================================
// PRODUCTION ORDER ENDPOINTS
// ====================================================================
router.post('/orders', verifyAuth, safeHandler(productionController.createProductionOrder, 'createProductionOrder'));
router.put('/orders/:id', verifyAuth, safeHandler(productionController.updateProductionOrder, 'updateProductionOrder'));
router.delete('/orders/:id', verifyAuth, safeHandler(productionController.deleteProductionOrder, 'deleteProductionOrder'));
router.post('/start', verifyAuth, safeHandler(productionController.startProduction, 'startProduction'));

// ====================================================================
// MACHINE OUTPUT ENDPOINTS
// ====================================================================
router.post('/outputs', verifyAuth, safeHandler(productionController.createOutputMc, 'createOutputMc'));

// ====================================================================
// ERP DASHBOARD & REPORTING ENDPOINTS
// ====================================================================
router.get('/dashboard', verifyAuth, safeHandler(productionController.getProductionDashboard, 'getProductionDashboard'));
router.get('/inventory-summary', verifyAuth, safeHandler(productionController.getInventorySummary, 'getInventorySummary'));
router.get('/machine-schedule', verifyAuth, safeHandler(productionController.getMachineSchedule, 'getMachineSchedule'));

module.exports = router;
