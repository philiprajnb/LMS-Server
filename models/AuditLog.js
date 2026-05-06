const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true
  },
  actor_id: {
    type: String,
    trim: true
  },
  actor_role: {
    type: String,
    trim: true,
    maxlength: [50, 'Actor role cannot be more than 50 characters']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [50, 'Action cannot be more than 50 characters']
  },
  entity_type: {
    type: String,
    required: [true, 'Entity type is required'],
    trim: true,
    maxlength: [50, 'Entity type cannot be more than 50 characters']
  },
  entity_id: {
    type: String,
    required: [true, 'Entity ID is required'],
    trim: true,
    maxlength: [100, 'Entity ID cannot be more than 100 characters']
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot be more than 500 characters']
  },
  metadata: {
    ip: {
      type: String,
      trim: true,
      maxlength: [100, 'IP cannot be more than 100 characters']
    },
    user_agent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent cannot be more than 500 characters']
    },
    // Assignment engine metadata
    rule_id: {
      type: String,
      trim: true
    },
    rule_name: {
      type: String,
      trim: true,
      maxlength: [100, 'Rule name cannot be more than 100 characters']
    },
    queue_id: {
      type: String,
      trim: true
    },
    assignment_method: {
      type: String,
      trim: true,
      maxlength: [50, 'Assignment method cannot be more than 50 characters']
    },
    fallback_reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Fallback reason cannot be more than 200 characters']
    }
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false
  }
});

auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ actor_id: 1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
