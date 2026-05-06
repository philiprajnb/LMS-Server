const Lead = require('../models/Lead');
const LeadQueue = require('../models/LeadQueue');
const Agent = require('../models/Agent');
const { claimLeadFromQueue } = require('../services/assignmentRuleEngine');

/**
 * GET /api/queues
 */
exports.listQueues = async (req, res) => {
  const filter = {};
  if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';

  const queues = await LeadQueue.find(filter).sort({ is_default: -1, name: 1 });

  // Attach live lead count per queue
  const ids = queues.map(q => q.id);
  const counts = await Lead.aggregate([
    { $match: { owner_type: 'queue', assignment_queue_id: { $in: ids }, deleted_at: { $exists: false } } },
    { $group: { _id: '$assignment_queue_id', count: { $sum: 1 } } }
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id, c.count]));

  const data = queues.map(q => ({
    ...q.toObject(),
    current_size: countMap[q.id] || 0
  }));

  res.json({ success: true, data, total: data.length });
};

/**
 * POST /api/queues
 */
exports.createQueue = async (req, res) => {
  const { name, description, is_default, routing_strategy, member_agent_ids, max_size, sla_hours } = req.body;

  const queue = await LeadQueue.create({
    name, description,
    is_default: is_default || false,
    routing_strategy: routing_strategy || 'manual',
    member_agent_ids: member_agent_ids || [],
    max_size: max_size || 0,
    sla_hours: sla_hours || 24,
    created_by: req.user.id
  });

  res.status(201).json({ success: true, data: queue });
};

/**
 * GET /api/queues/:id
 */
exports.getQueue = async (req, res) => {
  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

  const current_size = await Lead.countDocuments({
    owner_type: 'queue',
    assignment_queue_id: queue.id,
    deleted_at: { $exists: false }
  });

  res.json({ success: true, data: { ...queue.toObject(), current_size } });
};

/**
 * PUT /api/queues/:id
 */
exports.updateQueue = async (req, res) => {
  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

  const allowed = ['name', 'description', 'is_default', 'is_active', 'routing_strategy',
                   'member_agent_ids', 'max_size', 'sla_hours'];
  allowed.forEach(f => { if (req.body[f] !== undefined) queue[f] = req.body[f]; });

  await queue.save(); // pre-save hook handles single-default enforcement
  res.json({ success: true, data: queue });
};

/**
 * DELETE /api/queues/:id
 */
exports.deleteQueue = async (req, res) => {
  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
  if (queue.is_default) {
    return res.status(400).json({ success: false, message: 'Cannot delete the default queue' });
  }

  // Orphan leads in this queue → mark unassigned
  await Lead.updateMany(
    { assignment_queue_id: queue.id, owner_type: 'queue' },
    { $set: { owner_type: 'unassigned', assignment_queue_id: null, sla_due_at: null } }
  );

  await queue.deleteOne();
  res.json({ success: true, message: 'Queue deleted' });
};

/**
 * GET /api/queues/:id/leads
 * List leads currently in a queue with optional priority/status sorting.
 */
exports.getQueueLeads = async (req, res) => {
  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  const sortField = req.query.sort_by || 'sla_due_at';
  const sortDir = req.query.sort_dir === 'desc' ? -1 : 1;

  const filter = {
    owner_type: 'queue',
    assignment_queue_id: queue.id,
    deleted_at: { $exists: false }
  };

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .select('id first_name last_name email company_name lead_score priority status sla_due_at created_at'),
    Lead.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: leads,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
};

/**
 * POST /api/queues/:id/auto-claim
 * Admin auto-claims the next available lead from a queue (assigned directly to admin user).
 */
exports.autoClaimLead = async (req, res) => {
  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

  // Find the next available lead (by SLA due date, then creation date)
  const lead = await Lead.findOne({
    owner_type: 'queue',
    assignment_queue_id: queue.id,
    deleted_at: { $exists: false }
  }).sort({ sla_due_at: 1, created_at: 1 });

  if (!lead) {
    return res.status(404).json({ success: false, message: 'No leads available in this queue' });
  }

  // Assign lead directly to admin user
  lead.owner_type = 'agent';
  lead.assigned_to = req.user.id;
  lead.claimed_by = req.user.id;
  lead.claimed_at = new Date();
  lead.assignment_queue_id = null;

  if (!lead.assignment_history) lead.assignment_history = [];
  lead.assignment_history.push({
    assigned_to: req.user.id,
    assigned_by: req.user.id,
    assignment_method: 'manual',
    reason: `Admin ${req.user.name} claimed from queue`,
    assigned_at: new Date()
  });

  await lead.save();

  // Log to audit
  const AuditLog = require('../models/AuditLog');
  await AuditLog.create({
    actor_id: req.user.id,
    actor_role: req.user.role,
    action: 'lead_claimed',
    entity_type: 'lead',
    entity_id: lead.id,
    reason: `Admin claimed lead from queue`,
    metadata: {
      queue_id: queue.id,
      assignment_method: 'admin_claim'
    }
  });

  res.json({ success: true, data: lead, message: 'Lead claimed successfully' });
};

/**
 * POST /api/queues/:id/claim
 * Body: { lead_id } — agent claims a specific lead from the queue.
 */
exports.claimLead = async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) {
    return res.status(400).json({ success: false, message: 'lead_id is required' });
  }

  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });

  const lead = await Lead.findOne({ id: lead_id, assignment_queue_id: queue.id, owner_type: 'queue' });
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found in this queue' });
  }

  // Admins and managers claim directly without needing an Agent profile
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    lead.owner_type = 'agent';
    lead.assigned_to = req.user.id;
    lead.claimed_by = req.user.id;
    lead.claimed_at = new Date();
    lead.assignment_queue_id = null;

    if (!lead.assignment_history) lead.assignment_history = [];
    lead.assignment_history.push({
      assigned_to: req.user.id,
      assigned_by: req.user.id,
      assignment_method: 'manual',
      reason: `${req.user.role} ${req.user.name} claimed from queue`,
      assigned_at: new Date()
    });

    await lead.save();

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'lead_claimed',
      entity_type: 'lead',
      entity_id: lead.id,
      reason: `${req.user.role} claimed lead from queue`,
      metadata: { queue_id: queue.id, assignment_method: 'manual_claim' }
    });

    return res.json({ success: true, data: lead, message: 'Lead claimed successfully' });
  }

  // Agents must have an Agent profile
  const agent = await Agent.findOne({ email: req.user.email, is_active: true });
  if (!agent) {
    return res.status(403).json({ success: false, message: 'No active agent profile found for your account' });
  }

  try {
    const result = await claimLeadFromQueue(lead, agent, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    const statusCode = err.code === 'AGENT_AT_CAPACITY' ? 409 : 400;
    res.status(statusCode).json({ success: false, message: err.message, code: err.code });
  }
};

/**
 * POST /api/queues/:id/dispatch
 * Admin/manager dispatches next lead in queue to next available agent (round-robin).
 */
exports.dispatchFromQueue = async (req, res) => {
  const queue = await LeadQueue.findOne({ id: req.params.id });
  if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
  if (!queue.member_agent_ids.length) {
    return res.status(400).json({ success: false, message: 'Queue has no member agents' });
  }

  const lead = await Lead.findOne({
    owner_type: 'queue',
    assignment_queue_id: queue.id,
    deleted_at: { $exists: false }
  }).sort({ sla_due_at: 1, created_at: 1 });

  if (!lead) {
    return res.status(404).json({ success: false, message: 'No leads in queue' });
  }

  // Round-robin over members
  const poolSize = queue.member_agent_ids.length;
  let attempts = 0;
  let assigned = null;

  while (attempts < poolSize) {
    const updated = await LeadQueue.findOneAndUpdate(
      { id: queue.id },
      { $inc: { round_robin_index: 1 } },
      { new: true }
    );
    const idx = ((updated.round_robin_index - 1) % poolSize + poolSize) % poolSize;
    const agentId = queue.member_agent_ids[idx];
    const agent = await Agent.findOne({ id: agentId, is_active: true });
    if (!agent) { attempts++; continue; }

    try {
      const { claimLeadFromQueue: claim } = require('../services/assignmentRuleEngine');
      assigned = await claim(lead, agent, req.user.id);
      break;
    } catch (e) {
      attempts++;
    }
  }

  if (!assigned) {
    return res.status(409).json({ success: false, message: 'All member agents are at capacity' });
  }

  res.json({ success: true, data: assigned });
};
