const Joi = require('joi');

// Location schema
const locationSchema = Joi.object({
  city: Joi.string().allow(''),
  state: Joi.string().allow(''),
  country: Joi.string().allow('')
});

// Base Lead schema for creation
const createLeadSchema = Joi.object({
  first_name: Joi.string().required().trim().min(1).max(100),
  last_name: Joi.string().required().trim().min(1).max(100),
  email: Joi.string().email().required().trim().lowercase(),
  phone: Joi.string().optional().allow('').pattern(/^[\+]?[0-9\s\-\(\)]{10,20}$/),
  company: Joi.string().required().trim().min(1).max(200),
  job_title: Joi.string().optional().allow('').max(150),
  lead_source: Joi.string().required().trim().min(1).max(100),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Lost', 'Converted').default('New'),
  lead_score: Joi.number().integer().min(0).max(100).optional(),
  industry: Joi.string().optional().allow('').max(100),
  location: locationSchema.optional(),
  notes: Joi.string().optional().allow('').max(5000),
  assigned_to: Joi.string().uuid().optional(),
  next_follow_up: Joi.date().iso().optional(),
  priority: Joi.string().valid('Low', 'Medium', 'High').optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  deal_stage: Joi.string().optional().allow('').max(100),
  account_id: Joi.string().uuid().optional(),
  custom_fields: Joi.object().optional(),
  source_campaign: Joi.string().optional().allow('').max(200),
  communication_channel: Joi.string().optional().allow('').max(100),
  is_converted: Joi.boolean().optional().default(false),
  converted_at: Joi.date().iso().optional(),
  created_by: Joi.string().uuid().optional()
});

// Schema for updating a lead (all fields optional except those that shouldn't be changed)
const updateLeadSchema = Joi.object({
  first_name: Joi.string().optional().trim().min(1).max(100),
  last_name: Joi.string().optional().trim().min(1).max(100),
  email: Joi.string().email().optional().trim().lowercase(),
  phone: Joi.string().optional().allow('').pattern(/^[\+]?[0-9\s\-\(\)]{10,20}$/),
  company: Joi.string().optional().trim().min(1).max(200),
  job_title: Joi.string().optional().allow('').max(150),
  lead_source: Joi.string().optional().trim().min(1).max(100),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Lost', 'Converted').optional(),
  lead_score: Joi.number().integer().min(0).max(100).optional(),
  industry: Joi.string().optional().allow('').max(100),
  location: locationSchema.optional(),
  notes: Joi.string().optional().allow('').max(5000),
  assigned_to: Joi.string().uuid().optional().allow(null),
  next_follow_up: Joi.date().iso().optional().allow(null),
  priority: Joi.string().valid('Low', 'Medium', 'High').optional().allow(null),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  deal_stage: Joi.string().optional().allow('').max(100),
  account_id: Joi.string().uuid().optional().allow(null),
  custom_fields: Joi.object().optional(),
  source_campaign: Joi.string().optional().allow('').max(200),
  communication_channel: Joi.string().optional().allow('').max(100),
  is_converted: Joi.boolean().optional(),
  converted_at: Joi.date().iso().optional().allow(null),
  created_by: Joi.string().uuid().optional()
});

// Schema for query parameters
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Lost', 'Converted').optional(),
  priority: Joi.string().valid('Low', 'Medium', 'High').optional(),
  assigned_to: Joi.string().uuid().optional(),
  company: Joi.string().optional(),
  lead_source: Joi.string().optional(),
  is_converted: Joi.boolean().optional(),
  search: Joi.string().optional().max(100), // For searching across multiple fields
  sort_by: Joi.string().valid('created_at', 'updated_at', 'first_name', 'last_name', 'company', 'lead_score').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

// UUID parameter schema
const uuidSchema = Joi.string().uuid().required();

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  querySchema,
  uuidSchema
};