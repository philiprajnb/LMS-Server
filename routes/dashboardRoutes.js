const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { auth, authorize } = require('../middleware/auth');
const { validateDashboardSummaryQuery } = require('../middleware/validation');

const router = express.Router();

router.get('/summary', auth, authorize('admin', 'manager'), validateDashboardSummaryQuery, dashboardController.getSummary);

module.exports = router;
