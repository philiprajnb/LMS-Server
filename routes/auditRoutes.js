const express = require('express');
const auditController = require('../controllers/auditController');
const { auth, authorize } = require('../middleware/auth');
const { validateAuditQuery } = require('../middleware/validation');

const router = express.Router();

router.get('/', auth, authorize('admin', 'manager'), validateAuditQuery, auditController.listAuditLogs);

module.exports = router;
