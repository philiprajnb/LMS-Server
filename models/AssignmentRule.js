const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const criterionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['geography', 'source', 'score_band', 'industry', 'company_size', 'priority', 'tag']
  },
  // geography: { field: 'country'|'state'|'city', value: 'India' }
  // source: { value: 'Website' }
  // score_band: { min: 70, max: 100 }
  // industry: { value: 'SaaS' }  (case-insensitive contains)
  // company_size: { min: 100, max: 5000 }
  // priority: { value: 'Urgent'|'High'|'Medium'|'Low' }
  // tag: { value: 'enterprise' }
  field: {
    type: String,
    trim: true
  },
  operator: {
    type: String,
    enum: ['eq', 'neq', 'contains', 'gte', 'lte', 'between', 'in'],
    default: 'eq'
  },
  value: {
    type: mongoose.Schema.Types.Mixed
  },
  min: {
    type: Number
  },
  max: {
    type: Number
  },
  values: [{
    type: String
  }]
}, { _id: false });

const assignmentRuleSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: [100, 'Rule name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  // Lower number = higher priority (1 evaluated first)
  priority: {
    type: Number,
    required: [true, 'Priority is required'],
    min: [1, 'Priority must be at least 1'],
    default: 100
  },
  is_active: {
    type: Boolean,
    default: true
  },
  // All criteria must match (AND logic)
  criteria: {
    type: [criterionSchema],
    default: []
  },
  // What to do when rule matches
  assignment_method: {
    type: String,
    required: [true, 'Assignment method is required'],
    enum: ['direct', 'round_robin', 'queue']
  },
  // For direct assignment: target_agent_id
  target_agent_id: {
    type: String,
    trim: true
  },
  // For queue assignment: target_queue_id
  target_queue_id: {
    type: String,
    trim: true
  },
  // For round_robin: list of agent IDs to cycle through
  agent_pool: [{
    type: String,
    trim: true
  }],
  // Round-robin pointer (index into agent_pool)
  round_robin_index: {
    type: Number,
    default: 0
  },
  created_by: {
    type: String,
    trim: true
  },
  updated_by: {
    type: String,
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

assignmentRuleSchema.index({ priority: 1, is_active: 1 });
assignmentRuleSchema.index({ id: 1 });

module.exports = mongoose.model('AssignmentRule', assignmentRuleSchema);
