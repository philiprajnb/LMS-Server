const express = require('express');
const reportController = require('../controllers/reportController');
const { auth, authorize } = require('../middleware/auth');
const { validateReportsQuery } = require('../middleware/validation');

const router = express.Router();

router.get('/conversion-metrics', auth, authorize('admin', 'manager'), validateReportsQuery, reportController.conversionMetrics);
router.get('/leads-by-source', auth, authorize('admin', 'manager'), validateReportsQuery, reportController.leadsBySource);
router.get('/leads-by-stage', auth, authorize('admin', 'manager'), validateReportsQuery, reportController.leadsByStage);
router.get('/leads-by-region', auth, authorize('admin', 'manager'), validateReportsQuery, reportController.leadsByRegion);
router.get('/agent-performance', auth, authorize('admin', 'manager'), validateReportsQuery, reportController.agentPerformance);

module.exports = router;
