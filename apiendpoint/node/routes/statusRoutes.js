const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/authMiddleware');
const statusController = require('../controllers/statusController');

// GET /api/command/status/lot/:lot_number - Mencari status berdasarkan lot number
router.get('/lot/:lot_number', verifyAuth, statusController.getItemStatus);

// GET /api/command/status/part/:part_number - Mencari orders berdasarkan part number
router.get('/part/:part_number', verifyAuth, statusController.getItemStatusByPartNumber);

// GET /api/command/status/search - Autocomplete/search lot numbers
router.get('/search', verifyAuth, statusController.searchLotNumbers);

module.exports = router;
