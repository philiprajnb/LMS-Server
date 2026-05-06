/**
 * Assignment Rule Engine
 *
 * Evaluates assignment rules against a lead (priority first-match wins),
 * then executes the matched action: direct, round_robin, or queue.
 *
 * Policies enforced:
 * - Priority first-match: rules sorted by priority ASC; first match wins
 * - Hard capacity block: assignment rejected if agent active_lead_count >= max_capacity
 * - Queue-owned until claimed: queue leads stay in queue until agent calls /claim
 * - Default queue fallback: unmatched leads go to the is_default=true queue
 */

const Lead = require('../models/Lead');
const Agent = require('../models/Agent');
const AssignmentRule = require('../models/AssignmentRule');
const LeadQueue = require('../models/LeadQueue');
const AuditLog = require('../models/AuditLog');

// Statuses that count toward active capacity
const ACTIVE_STATUSES = ['New', 'Contacted', 'Qualified', 'Nurturing'];

/**
 * Returns current active lead count for an agent.
 */
async function getAgentActiveCount(agentId) {
  return Lead.countDocuments({
    assigned_to: agentId,
    owner_type: 'agent',
    status: { $in: ACTIVE_STATUSES },
    deleted_at: { $exists: false }
  });
}

/**
 * Checks whether an agent can accept a new lead (capacity + availability).
 * Throws a structured error if blocked.
 */
async function assertAgentCanAccept(agent) {
  if (!agent.is_active) {
    throw { code: 'AGENT_INACTIVE', message: `Agent ${agent.id} is not active` };
  }
  if (agent.is_locked) {
    throw { code: 'AGENT_LOCKED', message: `Agent ${agent.id} is locked` };
  }
  if (agent.availability === 'offline') {
    throw { code: 'AGENT_OFFLINE', message: `Agent ${agent.id} is offline` };
  }
  const active = await getAgentActiveCount(agent.id);
  if (active >= agent.max_capacity) {
    throw {
      code: 'AGENT_AT_CAPACITY',
      message: `Agent ${agent.id} is at capacity (${active}/${agent.max_capacity})`
    };
  }
}

// ---------------------------------------------------------------------------
// Criterion matchers
// ---------------------------------------------------------------------------

function matchGeography(lead, criterion) {
  const fieldMap = { country: 'country', state: 'state', city: 'city' };
  const key = criterion.field || 'country';
  const leadVal = (lead.location && lead.location[fieldMap[key]]) || '';
  return leadVal.toLowerCase() === String(criterion.value || '').toLowerCase();
}

function matchSource(lead, criterion) {
  return String(lead.lead_source || '').toLowerCase() === String(criterion.value || '').toLowerCase();
}

function matchScoreBand(lead, criterion) {
  const score = lead.lead_score || 0;
  const min = criterion.min !== undefined ? criterion.min : 0;
  const max = criterion.max !== undefined ? criterion.max : 100;
  return score >= min && score <= max;
}

function matchIndustry(lead, criterion) {
  if (!lead.industry) return false;
  return lead.industry.toLowerCase().includes(String(criterion.value || '').toLowerCase());
}

function matchCompanySize(lead, criterion) {
  const size = lead.company_size || 0;
  const min = criterion.min !== undefined ? criterion.min : 0;
  const max = criterion.max !== undefined ? criterion.max : Infinity;
  return size >= min && size <= max;
}

function matchPriority(lead, criterion) {
  const vals = criterion.values && criterion.values.length ? criterion.values : [criterion.value];
  return vals.map(v => String(v).toLowerCase()).includes(String(lead.priority || '').toLowerCase());
}

function matchTag(lead, criterion) {
  if (!lead.tags || !lead.tags.length) return false;
  const target = String(criterion.value || '').toLowerCase();
  return lead.tags.some(t => t.toLowerCase() === target);
}

/**
 * Returns true if the lead matches ALL criteria in a rule (AND logic).
 */
function evaluateCriteria(lead, criteria) {
  if (!criteria || criteria.length === 0) return true; // empty criteria = always match
  return criteria.every(criterion => {
    switch (criterion.type) {
      case 'geography':    return matchGeography(lead, criterion);
      case 'source':       return matchSource(lead, criterion);
      case 'score_band':   return matchScoreBand(lead, criterion);
      case 'industry':     return matchIndustry(lead, criterion);
      case 'company_size': return matchCompanySize(lead, criterion);
      case 'priority':     return matchPriority(lead, criterion);
      case 'tag':          return matchTag(lead, criterion);
      default:             return false;
    }
  });
}

// ---------------------------------------------------------------------------
// Assignment actions
// ---------------------------------------------------------------------------

/**
 * Assigns lead directly to a specific agent.
 */
async function executeDirectAssignment(lead, rule, actorId) {
  const agent = await Agent.findOne({ id: rule.target_agent_id });
  if (!agent) {
    throw { code: 'AGENT_NOT_FOUND', message: `Target agent ${rule.target_agent_id} not found` };
  }
  await assertAgentCanAccept(agent);

  return applyAgentAssignment(lead, agent, {
    method: 'direct',
    ruleId: rule.id,
    ruleName: rule.name,
    actorId
  });
}

/**
 * Assigns lead using round-robin across rule's agent_pool.
 * Increments rule.round_robin_index atomically.
 */
async function executeRoundRobinAssignment(lead, rule, actorId) {
  if (!rule.agent_pool || rule.agent_pool.length === 0) {
    throw { code: 'EMPTY_AGENT_POOL', message: `Rule ${rule.id} has no agents in pool` };
  }

  const poolSize = rule.agent_pool.length;
  let attempts = 0;

  while (attempts < poolSize) {
    // Atomically advance the pointer
    const updated = await AssignmentRule.findOneAndUpdate(
      { id: rule.id },
      { $inc: { round_robin_index: 1 } },
      { new: true }
    );
    const idx = ((updated.round_robin_index - 1) % poolSize + poolSize) % poolSize;
    const agentId = rule.agent_pool[idx];

    const agent = await Agent.findOne({ id: agentId });
    if (!agent) { attempts++; continue; }

    try {
      await assertAgentCanAccept(agent);
    } catch (e) {
      attempts++;
      continue; // try next in pool
    }

    return applyAgentAssignment(lead, agent, {
      method: 'round_robin',
      ruleId: rule.id,
      ruleName: rule.name,
      actorId
    });
  }

  throw { code: 'POOL_AT_CAPACITY', message: `All agents in pool for rule ${rule.id} are at capacity` };
}

/**
 * Places lead into a queue.
 */
async function executeQueueAssignment(lead, rule, actorId) {
  const queue = await LeadQueue.findOne({ id: rule.target_queue_id });
  if (!queue) {
    throw { code: 'QUEUE_NOT_FOUND', message: `Target queue ${rule.target_queue_id} not found` };
  }
  if (!queue.is_active) {
    throw { code: 'QUEUE_INACTIVE', message: `Queue ${queue.id} is not active` };
  }

  // Check queue capacity
  if (queue.max_size > 0) {
    const queueCount = await Lead.countDocuments({
      assignment_queue_id: queue.id,
      owner_type: 'queue',
      deleted_at: { $exists: false }
    });
    if (queueCount >= queue.max_size) {
      throw { code: 'QUEUE_FULL', message: `Queue ${queue.id} is full (${queueCount}/${queue.max_size})` };
    }
  }

  return applyQueueAssignment(lead, queue, {
    ruleId: rule.id,
    ruleName: rule.name,
    actorId
  });
}

/**
 * Persists agent assignment to a lead document.
 */
async function applyAgentAssignment(lead, agent, { method, ruleId, ruleName, actorId }) {
  const prev = lead.assigned_to;

  lead.assigned_to = agent.id;
  lead.owner_type = 'agent';
  lead.assignment_rule_id = ruleId || lead.assignment_rule_id;
  lead.assignment_queue_id = undefined;
  lead.claimed_by = undefined;
  lead.claimed_at = undefined;
  lead.sla_due_at = undefined;

  lead.assignment_history.push({
    assigned_to: agent.id,
    assigned_by: actorId,
    assignment_method: method,
    rule_id: ruleId,
    rule_name: ruleName,
    assigned_at: new Date()
  });

  await lead.save();

  await AuditLog.create({
    actor_id: actorId,
    actor_role: 'system',
    action: prev ? 'reassign' : 'assign',
    entity_type: 'lead',
    entity_id: lead.id,
    changes: { from: prev || null, to: agent.id },
    metadata: {
      rule_id: ruleId,
      rule_name: ruleName,
      assignment_method: method
    }
  });

  return { assigned_to: agent.id, owner_type: 'agent', method };
}

/**
 * Persists queue assignment to a lead document.
 */
async function applyQueueAssignment(lead, queue, { ruleId, ruleName, actorId }) {
  const slaDeadline = new Date(Date.now() + queue.sla_hours * 60 * 60 * 1000);

  lead.owner_type = 'queue';
  lead.assignment_queue_id = queue.id;
  lead.assignment_rule_id = ruleId || lead.assignment_rule_id;
  lead.assigned_to = undefined;
  lead.claimed_by = undefined;
  lead.claimed_at = undefined;
  lead.sla_due_at = slaDeadline;

  lead.assignment_history.push({
    assigned_to: null,
    assigned_by: actorId,
    assignment_method: 'queue',
    rule_id: ruleId,
    rule_name: ruleName,
    queue_id: queue.id,
    assigned_at: new Date()
  });

  await lead.save();

  await AuditLog.create({
    actor_id: actorId,
    actor_role: 'system',
    action: 'assign',
    entity_type: 'lead',
    entity_id: lead.id,
    changes: { queue_id: queue.id },
    metadata: {
      rule_id: ruleId,
      rule_name: ruleName,
      queue_id: queue.id,
      assignment_method: 'queue'
    }
  });

  return { queue_id: queue.id, owner_type: 'queue', method: 'queue', sla_due_at: slaDeadline };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Auto-assigns a single lead by running it through the rule engine.
 *
 * @param {Object} lead   - Mongoose Lead document
 * @param {string} actorId - UUID of the user/system triggering the assignment
 * @returns {Object} result with { assigned_to?, queue_id?, owner_type, method, rule_id?, fallback_reason? }
 */
async function autoAssignLead(lead, actorId) {
  // Fetch active rules sorted by priority ASC
  const rules = await AssignmentRule.find({ is_active: true }).sort({ priority: 1 });

  for (const rule of rules) {
    if (!evaluateCriteria(lead, rule.criteria)) continue;

    // First match wins
    try {
      let result;
      switch (rule.assignment_method) {
        case 'direct':
          result = await executeDirectAssignment(lead, rule, actorId);
          break;
        case 'round_robin':
          result = await executeRoundRobinAssignment(lead, rule, actorId);
          break;
        case 'queue':
          result = await executeQueueAssignment(lead, rule, actorId);
          break;
        default:
          continue;
      }
      return { ...result, rule_id: rule.id, rule_name: rule.name };
    } catch (err) {
      // Capacity/pool errors: fall through to next rule
      if (['AGENT_AT_CAPACITY', 'POOL_AT_CAPACITY', 'AGENT_OFFLINE',
           'AGENT_LOCKED', 'AGENT_INACTIVE', 'QUEUE_FULL', 'QUEUE_INACTIVE'].includes(err.code)) {
        continue;
      }
      throw err; // Unknown error — propagate
    }
  }

  // No rule matched → fallback to default queue
  const defaultQueue = await LeadQueue.findOne({ is_default: true, is_active: true });
  if (!defaultQueue) {
    throw {
      code: 'NO_DEFAULT_QUEUE',
      message: 'No active default queue configured and no rule matched'
    };
  }

  const result = await applyQueueAssignment(lead, defaultQueue, {
    ruleId: null,
    ruleName: null,
    actorId
  });

  return {
    ...result,
    fallback_reason: 'No matching rule — routed to default queue'
  };
}

/**
 * Claims a lead from a queue and assigns it to an agent.
 *
 * @param {Object} lead   - Mongoose Lead document (must have owner_type='queue')
 * @param {Object} agent  - Mongoose Agent document
 * @param {string} actorId - UUID of the claimant
 */
async function claimLeadFromQueue(lead, agent, actorId) {
  if (lead.owner_type !== 'queue') {
    throw { code: 'NOT_IN_QUEUE', message: 'Lead is not in a queue' };
  }

  await assertAgentCanAccept(agent);

  const queueId = lead.assignment_queue_id;

  lead.assigned_to = agent.id;
  lead.owner_type = 'agent';
  lead.claimed_by = agent.id;
  lead.claimed_at = new Date();
  lead.assignment_queue_id = undefined;
  lead.sla_due_at = undefined;

  lead.assignment_history.push({
    assigned_to: agent.id,
    assigned_by: actorId,
    assignment_method: 'manual',
    queue_id: queueId,
    reason: 'Claimed from queue',
    assigned_at: new Date()
  });

  await lead.save();

  await AuditLog.create({
    actor_id: actorId,
    actor_role: 'agent',
    action: 'assign',
    entity_type: 'lead',
    entity_id: lead.id,
    changes: { from_queue: queueId, to_agent: agent.id },
    metadata: {
      queue_id: queueId,
      assignment_method: 'manual'
    }
  });

  return { assigned_to: agent.id, owner_type: 'agent', method: 'claim', claimed_from_queue: queueId };
}

/**
 * Returns an ordered list of agents best suited for this lead, based on:
 * 1. Active rule match + agent capacity
 * 2. Availability
 * 3. Current active lead count (ascending)
 *
 * Does NOT mutate the lead — purely informational.
 */
async function suggestAgentsForLead(lead, limit = 5) {
  const rules = await AssignmentRule.find({ is_active: true }).sort({ priority: 1 });

  const agentScores = new Map(); // agentId -> { agent, score, rule }

  for (const rule of rules) {
    if (!evaluateCriteria(lead, rule.criteria)) continue;

    const agentIds = rule.assignment_method === 'direct'
      ? [rule.target_agent_id]
      : (rule.agent_pool || []);

    for (const agentId of agentIds) {
      if (agentScores.has(agentId)) continue;
      const agent = await Agent.findOne({ id: agentId, is_active: true });
      if (!agent || agent.is_locked || agent.availability === 'offline') continue;
      const active = await getAgentActiveCount(agentId);
      if (active >= agent.max_capacity) continue;
      agentScores.set(agentId, {
        agent_id: agentId,
        name: agent.name,
        email: agent.email,
        availability: agent.availability,
        active_leads: active,
        capacity: agent.max_capacity,
        matched_rule: rule.name
      });
    }
  }

  // Sort by active leads ascending
  return [...agentScores.values()]
    .sort((a, b) => a.active_leads - b.active_leads)
    .slice(0, limit);
}

module.exports = { autoAssignLead, claimLeadFromQueue, suggestAgentsForLead, getAgentActiveCount, assertAgentCanAccept };
