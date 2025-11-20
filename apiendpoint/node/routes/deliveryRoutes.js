const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const verifyAuth = require('../middleware/authMiddleware');

// Semua routes memerlukan authentication
router.use(verifyAuth);

// Delivery operations
router.post('/shipments', deliveryController.createDelivery);
router.post('/returns', deliveryController.createReturn);
router.put('/shipments/:id', deliveryController.updateDelivery);
router.put('/returns/:id', deliveryController.updateReturn);

module.exports = router;
