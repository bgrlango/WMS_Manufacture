// ====================================================================
// BOM ROUTES - BILL OF MATERIALS MANAGEMENT
// File: backend/node/routes/bomRoutes.js
// Purpose: Material planning dan BOM management routes
// Date: 2025-08-27
// ====================================================================

const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/authMiddleware');
const bomController = require('../controllers/bomController');

// ====================================================================
// BOM MANAGEMENT ENDPOINTS
// ====================================================================

// Create new BOM for a part number
router.post('/', verifyAuth, bomController.createBOM);

// Get BOM by part number
router.get('/:parent_part_number', verifyAuth, bomController.getBOMByPartNumber);

// Calculate material requirements for production quantity
router.post('/calculate-requirements', verifyAuth, bomController.calculateMaterialRequirements);

// Update BOM material
router.put('/materials/:bom_id', verifyAuth, bomController.updateBOMMaterial);

// Delete BOM material (soft delete)
router.delete('/materials/:bom_id', verifyAuth, bomController.deleteBOMMaterial);

module.exports = router;
