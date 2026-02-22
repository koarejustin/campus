const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const authGuard = require('../middleware/authMiddleware');

// Stats pour le dashboard admin
router.get('/stats', authGuard, adminController.getStats);

module.exports = router;
