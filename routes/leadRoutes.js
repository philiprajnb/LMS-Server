const express = require('express');
const LeadController = require('../controllers/leadController');
const { auth, authorize } = require('../middleware/auth');
const {
  validateQueryParams,
  validateLeadId
} = require('../middleware/validation');

const router = express.Router();
const leadController = new LeadController();

// All lead routes require authentication
router.use(auth);

// Lead CRUD routes
router.post('/', leadController.createLead);
router.get('/', validateQueryParams, leadController.getAllLeads);
router.get('/stats', leadController.getLeadStats);
router.get('/:id', validateLeadId, leadController.getLeadById);
router.put('/:id', validateLeadId, leadController.updateLead);
router.delete('/:id', validateLeadId, leadController.deleteLead);
router.delete('/:id/hard', validateLeadId, leadController.hardDeleteLead);

// Bulk operations
router.post('/bulk/update', leadController.bulkUpdateLeads);
router.post('/bulk/delete', leadController.bulkDeleteLeads);
router.post('/bulk/auto-assign', authorize('admin', 'manager'), leadController.bulkAutoAssignLeads);

// Lead scoring endpoints
router.get('/:id/scoring', validateLeadId, leadController.getLeadScoring);
router.get('/:id/recommendations', validateLeadId, leadController.getLeadRecommendations);
router.post('/bulk/score', leadController.bulkScoreLeads);

// Lead classification endpoints
router.get('/classification/:type', leadController.getLeadsByClassification);
router.get('/classification/:type/stats', leadController.getClassificationStats);

// Assignment engine endpoints
router.post('/:id/auto-assign', validateLeadId, authorize('admin', 'manager'), leadController.autoAssignLead);
router.get('/:id/suggested-agents', validateLeadId, authorize('admin', 'manager'), leadController.getSuggestedAgents);

module.exports = router;