const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/authMiddleware');
const warehouseController = require('../controllers/warehouseController');
router.post('/delivery', verifyAuth, warehouseController.createDelivery);
router.post('/returns', verifyAuth, warehouseController.createReturn);
module.exports = router;
