const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const leadSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true
  },
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [100, 'Email cannot be more than 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  job_title: {
    type: String,
    trim: true,
    maxlength: [100, 'Job title cannot be more than 100 characters']
  },
  
  // Company information
  company_id: {
    type: String, // UUID reference to accounts table
    trim: true
  },
  company_name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  company_website: {
    type: String,
    trim: true,
    maxlength: [200, 'Company website cannot be more than 200 characters']
  },
  
  // Business context
  role_in_decision: {
    type: String,
    enum: ['Decision Maker', 'Influencer', 'End User', 'Champion', 'Gatekeeper'],
    default: 'Influencer'
  },
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot be more than 100 characters']
  },
  company_size: {
    type: Number,
    min: [1, 'Company size must be at least 1'],
    max: [1000000, 'Company size cannot exceed 1,000,000']
  },
  annual_revenue: {
    type: Number,
    min: [0, 'Annual revenue cannot be negative']
  },
  
  // Lead management
  lead_source: {
    type: String,
    required: [true, 'Lead source is required'],
    trim: true,
    maxlength: [100, 'Lead source cannot be more than 100 characters']
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Lost', 'Converted', 'Nurturing', 'Rejected'],
    default: 'New'
  },
  lead_score: {
    type: Number,
    min: [0, 'Lead score cannot be negative'],
    max: [100, 'Lead score cannot exceed 100'],
    default: 0
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  
  // Location
  location: {
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot be more than 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot be more than 50 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, 'Country cannot be more than 50 characters']
    }
  },
  
  // Additional fields
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot be more than 2000 characters']
  },
  
  // Assignment and follow-up
  assigned_to: {
    type: String, // UUID reference to users table
    trim: true
  },
  next_follow_up: {
    type: Date
  },
  deal_stage: {
    type: String,
    trim: true,
    maxlength: [100, 'Deal stage cannot be more than 100 characters']
  },
  account_id: {
    type: String, // UUID reference to accounts table
    trim: true
  },
  
  // Customization
  custom_fields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  source_campaign: {
    type: String,
    trim: true,
    maxlength: [100, 'Source campaign cannot be more than 100 characters']
  },
  communication_channel: {
    type: String,
    enum: ['Email', 'Phone', 'LinkedIn', 'Website', 'Referral', 'Event', 'Other'],
    default: 'Email'
  },
  
  // Conversion tracking
  is_converted: {
    type: Boolean,
    default: false
  },
  converted_at: {
    type: Date
  },
  
  // Metadata
  created_by: {
    type: String, // UUID reference to users table
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for better query performance
leadSchema.index({ email: 1 });
leadSchema.index({ company_name: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assigned_to: 1 });
leadSchema.index({ created_at: -1 });
leadSchema.index({ next_follow_up: 1 });
leadSchema.index({ is_converted: 1 });

// Virtual for full name
leadSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Virtual for company info
leadSchema.virtual('company_info').get(function() {
  return {
    id: this.company_id,
    name: this.company_name,
    website: this.company_website
  };
});

// Pre-save middleware to ensure email is lowercase
leadSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Instance method to update lead
leadSchema.methods.updateLead = function(updateData) {
  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'job_title',
    'company_id', 'company_name', 'company_website',
    'role_in_decision', 'industry', 'company_size', 'annual_revenue',
    'lead_source', 'status', 'lead_score', 'priority', 'location',
    'tags', 'notes', 'assigned_to', 'next_follow_up', 'deal_stage',
    'account_id', 'custom_fields', 'source_campaign', 'communication_channel',
    'is_converted', 'converted_at'
  ];

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      this[field] = updateData[field];
    }
  });

  this.updated_at = new Date();
  return this.save();
};

// Instance method to soft delete
leadSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  this.updated_at = new Date();
  return this.save();
};

// Instance method to convert lead
leadSchema.methods.convertLead = function() {
  this.is_converted = true;
  this.converted_at = new Date();
  this.status = 'Converted';
  this.updated_at = new Date();
  return this.save();
};

// Static method to get valid statuses
leadSchema.statics.getValidStatuses = function() {
  return ['New', 'Contacted', 'Qualified', 'Lost', 'Converted', 'Nurturing', 'Rejected'];
};

// Static method to get valid priorities
leadSchema.statics.getValidPriorities = function() {
  return ['Low', 'Medium', 'High', 'Urgent'];
};

// Static method to get valid communication channels
leadSchema.statics.getValidCommunicationChannels = function() {
  return ['Email', 'Phone', 'LinkedIn', 'Website', 'Referral', 'Event', 'Other'];
};

// Static method to get valid decision roles
leadSchema.statics.getValidDecisionRoles = function() {
  return ['Decision Maker', 'Influencer', 'End User', 'Champion', 'Gatekeeper'];
};

// Query middleware to exclude soft-deleted leads by default
leadSchema.pre(/^find/, function(next) {
  if (this.getQuery().includeDeleted !== true) {
    this.where({ deleted_at: { $exists: false } });
  }
  next();
});

// Method to convert to JSON (excluding deleted_at by default)
leadSchema.methods.toJSON = function() {
  const leadObject = this.toObject();
  delete leadObject.deleted_at;
  return leadObject;
};

module.exports = mongoose.model('Lead', leadSchema);