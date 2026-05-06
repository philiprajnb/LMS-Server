const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const {
  listRules, createRule, getRule, updateRule, deleteRule,
  activateRule, deactivateRule, reorderRules
} = require('../controllers/assignmentRuleController');
const {
  validateCreateAssignmentRule,
  validateUpdateAssignmentRule,
  validateReorderRules
} = require('../middleware/validation');

router.use(auth);
router.use(authorize('admin', 'manager'));

router.get('/', listRules);
router.post('/', validateCreateAssignmentRule, createRule);
router.post('/reorder', validateReorderRules, reorderRules);
router.get('/:id', getRule);
router.put('/:id', validateUpdateAssignmentRule, updateRule);
router.delete('/:id', deleteRule);
router.patch('/:id/activate', activateRule);
router.patch('/:id/deactivate', deactivateRule);

module.exports = router;
