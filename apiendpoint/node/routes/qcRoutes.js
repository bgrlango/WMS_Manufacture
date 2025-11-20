const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/authMiddleware');
const qcController = require('../controllers/qcController');

// ====================================================================
// OQC ROUTES (Enhanced)
// ====================================================================
router.post('/oqc', verifyAuth, qcController.createOqcRecord);
router.put('/oqc/:id', verifyAuth, qcController.updateOqcRecord);
router.post('/oqc/:id/approve', verifyAuth, qcController.approveOqcRecord);

// ====================================================================
// INSPECTION PLAN ROUTES
// ====================================================================
router.post('/inspection-plans', verifyAuth, qcController.createInspectionPlan);
router.put('/inspection-plans/:id', verifyAuth, qcController.updateInspectionPlan);

// ====================================================================
// INSPECTION RESULT ROUTES
// ====================================================================
router.post('/inspection-results', verifyAuth, qcController.createInspectionResult);

// ====================================================================
// NON-CONFORMANCE REPORT ROUTES
// ====================================================================
router.post('/non-conformance', verifyAuth, qcController.createNonConformance);
router.put('/non-conformance/:id', verifyAuth, qcController.updateNonConformance);

// ====================================================================
// LEGACY ROUTES (Keep for backward compatibility)
// ====================================================================
router.post('/transfer', verifyAuth, qcController.createTransferQc);

module.exports = router;
