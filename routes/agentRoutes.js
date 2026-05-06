const express = require('express');
const agentController = require('../controllers/agentController');
const { auth, authorize } = require('../middleware/auth');
const {
	validateAgentListQuery,
	validateCreateAgent,
	validateUpdateAgent,
	validateAssignLeads,
	validateReassignLeads,
	validateUuidParam
} = require('../middleware/validation');

const router = express.Router();

router.get('/', auth, authorize('admin', 'manager'), validateAgentListQuery, agentController.listAgents);
router.get('/:id', auth, authorize('admin', 'manager'), validateUuidParam, agentController.getAgentById);
router.post('/', auth, authorize('admin'), validateCreateAgent, agentController.createAgent);
router.put('/:id', auth, authorize('admin'), validateUuidParam, validateUpdateAgent, agentController.updateAgent);
router.get('/:id/capacity', auth, authorize('admin', 'manager'), validateUuidParam, agentController.getCapacity);
router.post('/:id/assign', auth, authorize('admin', 'manager'), validateUuidParam, validateAssignLeads, agentController.assignLeads);
router.post('/:id/reassign', auth, authorize('admin', 'manager'), validateUuidParam, validateReassignLeads, agentController.reassignLeads);

module.exports = router;
