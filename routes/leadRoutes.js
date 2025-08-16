const express = require('express');
const LeadController = require('../controllers/leadController');
const {
  validateQueryParams,
  validateLeadId
} = require('../middleware/validation');

const router = express.Router();
const leadController = new LeadController();

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

// Lead scoring endpoints
router.get('/:id/scoring', validateLeadId, leadController.getLeadScoring);
router.get('/:id/recommendations', validateLeadId, leadController.getLeadRecommendations);
router.post('/bulk/score', leadController.bulkScoreLeads);

module.exports = router;