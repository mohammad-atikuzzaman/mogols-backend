const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/summary').get(protect, admin, getDashboardSummary);

module.exports = router;
