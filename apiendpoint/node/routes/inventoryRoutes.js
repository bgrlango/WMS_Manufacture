// ====================================================================
// INVENTORY ROUTES - INVENTORY MANAGEMENT
// File: backend/node/routes/inventoryRoutes.js
// Purpose: Multi-location inventory management routes
// Date: 2025-08-27
// ====================================================================

const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/authMiddleware');
const inventoryController = require('../controllers/inventoryController');

// ====================================================================
// INVENTORY MOVEMENT ENDPOINTS
// ====================================================================

// Create inventory receipt (receiving goods)
router.post('/receipts', verifyAuth, inventoryController.createInventoryReceipt);

// Create inventory transfer between locations
router.post('/transfers', verifyAuth, inventoryController.createInventoryTransfer);

// Create inventory adjustment (cycle count, scrap, etc)
router.post('/adjustments', verifyAuth, inventoryController.createInventoryAdjustment);

// ====================================================================
// INVENTORY INQUIRY ENDPOINTS
// ====================================================================

// Get inventory balances with filters
router.get('/balances', verifyAuth, inventoryController.getInventoryBalances);

// Get inventory movements history
router.get('/movements', verifyAuth, inventoryController.getInventoryMovements);

// Get inventory locations
router.get('/locations', verifyAuth, inventoryController.getInventoryLocations);

module.exports = router;
