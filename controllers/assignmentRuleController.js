const AssignmentRule = require('../models/AssignmentRule');

/**
 * GET /api/assignment-rules
 * List all rules (sorted by priority).
 */
exports.listRules = async (req, res) => {
  const rules = await AssignmentRule.find().sort({ priority: 1 });
  res.json({ success: true, data: rules, total: rules.length });
};

/**
 * POST /api/assignment-rules
 * Create a new rule.
 */
exports.createRule = async (req, res) => {
  const { name, description, priority, criteria, assignment_method,
          target_agent_id, target_queue_id, agent_pool } = req.body;

  // Validate method-specific fields
  if (assignment_method === 'direct' && !target_agent_id) {
    return res.status(400).json({ success: false, message: 'target_agent_id required for direct assignment' });
  }
  if (assignment_method === 'queue' && !target_queue_id) {
    return res.status(400).json({ success: false, message: 'target_queue_id required for queue assignment' });
  }
  if (assignment_method === 'round_robin' && (!agent_pool || agent_pool.length === 0)) {
    return res.status(400).json({ success: false, message: 'agent_pool required for round_robin assignment' });
  }

  const rule = await AssignmentRule.create({
    name, description, priority, criteria: criteria || [],
    assignment_method, target_agent_id, target_queue_id,
    agent_pool: agent_pool || [],
    created_by: req.user.id
  });

  res.status(201).json({ success: true, data: rule });
};

/**
 * GET /api/assignment-rules/:id
 */
exports.getRule = async (req, res) => {
  const rule = await AssignmentRule.findOne({ id: req.params.id });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
  res.json({ success: true, data: rule });
};

/**
 * PUT /api/assignment-rules/:id
 */
exports.updateRule = async (req, res) => {
  const rule = await AssignmentRule.findOne({ id: req.params.id });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

  const allowed = ['name', 'description', 'priority', 'criteria',
                   'assignment_method', 'target_agent_id', 'target_queue_id', 'agent_pool'];
  allowed.forEach(f => { if (req.body[f] !== undefined) rule[f] = req.body[f]; });
  rule.updated_by = req.user.id;

  await rule.save();
  res.json({ success: true, data: rule });
};

/**
 * DELETE /api/assignment-rules/:id
 */
exports.deleteRule = async (req, res) => {
  const rule = await AssignmentRule.findOne({ id: req.params.id });
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

  await rule.deleteOne();
  res.json({ success: true, message: 'Rule deleted' });
};

/**
 * PATCH /api/assignment-rules/:id/activate
 */
exports.activateRule = async (req, res) => {
  const rule = await AssignmentRule.findOneAndUpdate(
    { id: req.params.id }, { is_active: true }, { new: true }
  );
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
  res.json({ success: true, data: rule });
};

/**
 * PATCH /api/assignment-rules/:id/deactivate
 */
exports.deactivateRule = async (req, res) => {
  const rule = await AssignmentRule.findOneAndUpdate(
    { id: req.params.id }, { is_active: false }, { new: true }
  );
  if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
  res.json({ success: true, data: rule });
};

/**
 * POST /api/assignment-rules/reorder
 * Body: [{ id, priority }] — batch-update priorities.
 */
exports.reorderRules = async (req, res) => {
  const updates = req.body.rules; // [{ id, priority }]
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, message: 'rules array required' });
  }

  await Promise.all(
    updates.map(({ id, priority }) =>
      AssignmentRule.updateOne({ id }, { $set: { priority } })
    )
  );

  const rules = await AssignmentRule.find().sort({ priority: 1 });
  res.json({ success: true, data: rules });
};
