const Joi = require('joi');

// Location schema
const locationSchema = Joi.object({
  city: Joi.string().allow('').max(50),
  state: Joi.string().allow('').max(50),
  country: Joi.string().allow('').max(50)
});

// Base Lead schema for creation
const createLeadSchema = Joi.object({
  first_name: Joi.string().required().trim().min(1).max(50),
  last_name: Joi.string().required().trim().min(1).max(50),
  email: Joi.string().email().required().trim().lowercase().max(100),
  phone: Joi.string().optional().allow('').pattern(/^[\+]?[0-9\s\-\(\)]{10,20}$/).max(20),
  job_title: Joi.string().optional().allow('').max(100),
  
  // Company information
  company_id: Joi.string().uuid().optional(),
  company_name: Joi.string().required().trim().min(1).max(100),
  company_website: Joi.string().optional().allow('').max(200),
  
  // Business context
  role_in_decision: Joi.string().valid('Decision Maker', 'Influencer', 'End User', 'Champion', 'Gatekeeper').default('Influencer'),
  industry: Joi.string().optional().allow('').max(100),
  company_size: Joi.number().integer().min(1).max(1000000).optional(),
  annual_revenue: Joi.number().min(0).optional(),
  
  // Lead management
  lead_source: Joi.string().required().trim().min(1).max(100),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Lost', 'Converted', 'Nurturing', 'Rejected').default('New'),
  lead_score: Joi.number().integer().min(0).max(100).optional().default(0),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').default('Medium'),
  
  // Location
  location: locationSchema.optional(),
  
  // Additional fields
  tags: Joi.array().items(Joi.string().max(30)).optional(),
  notes: Joi.string().optional().allow('').max(2000),
  
  // Assignment and follow-up
  assigned_to: Joi.string().uuid().optional(),
  next_follow_up: Joi.date().iso().optional(),
  deal_stage: Joi.string().optional().allow('').max(100),
  account_id: Joi.string().uuid().optional(),
  
  // Customization
  custom_fields: Joi.object().optional(),
  source_campaign: Joi.string().optional().allow('').max(100),
  communication_channel: Joi.string().valid('Email', 'Phone', 'LinkedIn', 'Website', 'Referral', 'Event', 'Other').default('Email'),
  
  // Conversion tracking
  is_converted: Joi.boolean().optional().default(false),
  converted_at: Joi.date().iso().optional(),
  
  // Metadata
  created_by: Joi.string().uuid().optional()
});

// Schema for updating a lead (all fields optional except those that shouldn't be changed)
const updateLeadSchema = Joi.object({
  first_name: Joi.string().optional().trim().min(1).max(50),
  last_name: Joi.string().optional().trim().min(1).max(50),
  email: Joi.string().email().optional().trim().lowercase().max(100),
  phone: Joi.string().optional().allow('').pattern(/^[\+]?[0-9\s\-\(\)]{10,20}$/).max(20),
  job_title: Joi.string().optional().allow('').max(100),
  
  // Company information
  company_id: Joi.string().uuid().optional(),
  company_name: Joi.string().optional().trim().min(1).max(100),
  company_website: Joi.string().optional().allow('').max(200),
  
  // Business context
  role_in_decision: Joi.string().valid('Decision Maker', 'Influencer', 'End User', 'Champion', 'Gatekeeper').optional(),
  industry: Joi.string().optional().allow('').max(100),
  company_size: Joi.number().integer().min(1).max(1000000).optional(),
  annual_revenue: Joi.number().min(0).optional(),
  
  // Lead management
  lead_source: Joi.string().optional().trim().min(1).max(100),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Lost', 'Converted', 'Nurturing', 'Rejected').optional(),
  lead_score: Joi.number().integer().min(0).max(100).optional(),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').optional(),
  
  // Location
  location: locationSchema.optional(),
  
  // Additional fields
  tags: Joi.array().items(Joi.string().max(30)).optional(),
  notes: Joi.string().optional().allow('').max(2000),
  
  // Assignment and follow-up
  assigned_to: Joi.string().uuid().optional().allow(null),
  next_follow_up: Joi.date().iso().optional().allow(null),
  deal_stage: Joi.string().optional().allow('').max(100),
  account_id: Joi.string().uuid().optional().allow(null),
  
  // Customization
  custom_fields: Joi.object().optional(),
  source_campaign: Joi.string().optional().allow('').max(100),
  communication_channel: Joi.string().valid('Email', 'Phone', 'LinkedIn', 'Website', 'Referral', 'Event', 'Other').optional(),
  
  // Conversion tracking
  is_converted: Joi.boolean().optional(),
  converted_at: Joi.date().iso().optional().allow(null),
  
  // Metadata
  created_by: Joi.string().uuid().optional()
});

// Schema for query parameters
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Lost', 'Converted', 'Nurturing', 'Rejected').optional(),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').optional(),
  assigned_to: Joi.string().uuid().optional(),
  company_name: Joi.string().optional(),
  lead_source: Joi.string().optional(),
  industry: Joi.string().optional(),
  role_in_decision: Joi.string().valid('Decision Maker', 'Influencer', 'End User', 'Champion', 'Gatekeeper').optional(),
  is_converted: Joi.boolean().optional(),
  search: Joi.string().optional().max(100), // For searching across multiple fields
  sort_by: Joi.string().valid('created_at', 'updated_at', 'first_name', 'last_name', 'company_name', 'lead_score', 'priority', 'status').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

// UUID parameter schema
const uuidSchema = Joi.string().uuid().required();
const idParamSchema = Joi.object({
  id: uuidSchema
});

// Common query fields for reporting/dashboard endpoints
const dateRangeQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  owner_id: Joi.string().uuid().optional(),
  region: Joi.string().trim().max(50).optional()
});

// Agent schemas
const createAgentSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(100),
  email: Joi.string().email().required().trim().lowercase().max(100),
  phone: Joi.string().optional().allow('').pattern(/^[\+]?[0-9\s\-\(\)]{10,20}$/).max(20),
  region: Joi.string().optional().allow('').max(50).default('Global'),
  max_capacity: Joi.number().integer().min(1).max(10000).default(50),
  availability: Joi.string().valid('available', 'busy', 'offline').default('available'),
  is_locked: Joi.boolean().optional(),
  is_active: Joi.boolean().optional()
});

const updateAgentSchema = Joi.object({
  name: Joi.string().optional().trim().min(1).max(100),
  email: Joi.string().email().optional().trim().lowercase().max(100),
  phone: Joi.string().optional().allow('').pattern(/^[\+]?[0-9\s\-\(\)]{10,20}$/).max(20),
  region: Joi.string().optional().allow('').max(50),
  max_capacity: Joi.number().integer().min(1).max(10000).optional(),
  availability: Joi.string().valid('available', 'busy', 'offline').optional(),
  is_locked: Joi.boolean().optional(),
  is_active: Joi.boolean().optional()
}).min(1);

const agentListQuerySchema = Joi.object({
  region: Joi.string().optional().max(50),
  availability: Joi.string().valid('available', 'busy', 'offline').optional(),
  is_locked: Joi.boolean().optional(),
  is_active: Joi.boolean().optional().default(true)
});

const assignLeadsSchema = Joi.object({
  lead_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  reason: Joi.string().optional().allow('').max(500)
});

const reassignLeadsSchema = Joi.object({
  lead_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  from_agent_id: Joi.string().uuid().optional(),
  reason: Joi.string().optional().allow('').max(500)
});

// Reports and dashboard query schemas
const dashboardSummaryQuerySchema = dateRangeQuerySchema;
const reportsQuerySchema = dateRangeQuerySchema.keys({
  agent_id: Joi.string().uuid().optional()
});

// Audit query schema
const auditQuerySchema = Joi.object({
  actor_id: Joi.string().optional(),
  entity_type: Joi.string().optional().max(50),
  entity_id: Joi.string().optional().max(100),
  action: Joi.string().optional().max(50),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Auth admin bootstrap schema
const promoteAdminSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase().max(100),
  reason: Joi.string().optional().allow('').max(500)
});

// ---------------------------------------------------------------------------
// Assignment Rule schemas
// ---------------------------------------------------------------------------
const criterionSchema = Joi.object({
  type: Joi.string().valid('geography', 'source', 'score_band', 'industry', 'company_size', 'priority', 'tag').required(),
  field: Joi.string().max(50).when('type', { is: 'geography', then: Joi.valid('country', 'state', 'city'), otherwise: Joi.optional() }),
  operator: Joi.string().valid('eq', 'neq', 'contains', 'gte', 'lte', 'between', 'in').default('eq'),
  value: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  min: Joi.number().optional(),
  max: Joi.number().optional(),
  values: Joi.array().items(Joi.string()).optional()
});

const createAssignmentRuleSchema = Joi.object({
  name: Joi.string().required().trim().max(100),
  description: Joi.string().optional().allow('').max(500),
  priority: Joi.number().integer().min(1).required(),
  criteria: Joi.array().items(criterionSchema).default([]),
  assignment_method: Joi.string().valid('direct', 'round_robin', 'queue').required(),
  target_agent_id: Joi.string().uuid().when('assignment_method', { is: 'direct', then: Joi.required(), otherwise: Joi.optional() }),
  target_queue_id: Joi.string().uuid().when('assignment_method', { is: 'queue', then: Joi.required(), otherwise: Joi.optional() }),
  agent_pool: Joi.array().items(Joi.string().uuid()).when('assignment_method', { is: 'round_robin', then: Joi.array().items(Joi.string().uuid()).min(1).required(), otherwise: Joi.optional() })
});

const updateAssignmentRuleSchema = Joi.object({
  name: Joi.string().trim().max(100),
  description: Joi.string().allow('').max(500),
  priority: Joi.number().integer().min(1),
  criteria: Joi.array().items(criterionSchema),
  assignment_method: Joi.string().valid('direct', 'round_robin', 'queue'),
  target_agent_id: Joi.string().uuid(),
  target_queue_id: Joi.string().uuid(),
  agent_pool: Joi.array().items(Joi.string().uuid())
}).min(1);

const reorderRulesSchema = Joi.object({
  rules: Joi.array().items(
    Joi.object({ id: Joi.string().uuid().required(), priority: Joi.number().integer().min(1).required() })
  ).min(1).required()
});

// ---------------------------------------------------------------------------
// Lead Queue schemas
// ---------------------------------------------------------------------------
const createQueueSchema = Joi.object({
  name: Joi.string().required().trim().max(100),
  description: Joi.string().optional().allow('').max(500),
  is_default: Joi.boolean().default(false),
  routing_strategy: Joi.string().valid('round_robin', 'first_available', 'manual').default('manual'),
  member_agent_ids: Joi.array().items(Joi.string().uuid()).default([]),
  max_size: Joi.number().integer().min(0).default(0),
  sla_hours: Joi.number().integer().min(1).default(24)
});

const updateQueueSchema = Joi.object({
  name: Joi.string().trim().max(100),
  description: Joi.string().allow('').max(500),
  is_default: Joi.boolean(),
  is_active: Joi.boolean(),
  routing_strategy: Joi.string().valid('round_robin', 'first_available', 'manual'),
  member_agent_ids: Joi.array().items(Joi.string().uuid()),
  max_size: Joi.number().integer().min(0),
  sla_hours: Joi.number().integer().min(1)
}).min(1);

const claimLeadSchema = Joi.object({
  lead_id: Joi.string().uuid().required()
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  querySchema,
  uuidSchema,
  idParamSchema,
  createAgentSchema,
  updateAgentSchema,
  agentListQuerySchema,
  assignLeadsSchema,
  reassignLeadsSchema,
  dashboardSummaryQuerySchema,
  reportsQuerySchema,
  auditQuerySchema,
  promoteAdminSchema,
  createAssignmentRuleSchema,
  updateAssignmentRuleSchema,
  reorderRulesSchema,
  createQueueSchema,
  updateQueueSchema,
  claimLeadSchema
};