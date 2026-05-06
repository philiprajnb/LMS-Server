const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  listQueues, createQueue, getQueue, updateQueue, deleteQueue,
  getQueueLeads, claimLead, autoClaimLead, dispatchFromQueue
} = require('../controllers/queueController');
const {
  validateCreateQueue,
  validateUpdateQueue,
  validateClaimLead
} = require('../middleware/validation');

router.use(auth);

// Queue management — admin/manager only
router.get('/', authorize('admin', 'manager'), listQueues);
router.post('/', authorize('admin', 'manager'), validateCreateQueue, createQueue);
router.get('/:id', authorize('admin', 'manager', 'agent'), getQueue);
router.put('/:id', authorize('admin', 'manager'), validateUpdateQueue, updateQueue);
router.delete('/:id', authorize('admin', 'manager'), deleteQueue);

// Queue leads
router.get('/:id/leads', authorize('admin', 'manager', 'agent'), getQueueLeads);
router.post('/:id/claim', authorize('admin', 'manager', 'agent'), validateClaimLead, claimLead);
router.post('/:id/auto-claim', authorize('admin'), autoClaimLead);
router.post('/:id/dispatch', authorize('admin', 'manager'), dispatchFromQueue);

module.exports = router;
