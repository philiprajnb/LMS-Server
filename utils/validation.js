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

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  querySchema,
  uuidSchema
};