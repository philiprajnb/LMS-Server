const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const leadQueueSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Queue name is required'],
    trim: true,
    maxlength: [100, 'Queue name cannot be more than 100 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  // Only one queue can be the default fallback
  is_default: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  // Agent UUIDs who are members of this queue
  member_agent_ids: [{
    type: String,
    trim: true
  }],
  // How leads in the queue get claimed/dispatched
  routing_strategy: {
    type: String,
    enum: ['round_robin', 'first_available', 'manual'],
    default: 'manual'
  },
  // Round-robin pointer across member_agent_ids
  round_robin_index: {
    type: Number,
    default: 0
  },
  // Maximum leads this queue can hold (0 = unlimited)
  max_size: {
    type: Number,
    default: 0,
    min: [0, 'Max size cannot be negative']
  },
  // SLA hours for leads in this queue
  sla_hours: {
    type: Number,
    default: 24,
    min: [1, 'SLA hours must be at least 1']
  },
  created_by: {
    type: String,
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

leadQueueSchema.index({ id: 1 });
leadQueueSchema.index({ is_default: 1 });
leadQueueSchema.index({ is_active: 1 });

// Enforce single default queue at the model level
leadQueueSchema.pre('save', async function(next) {
  if (this.is_default && this.isModified('is_default')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, is_default: true },
      { $set: { is_default: false } }
    );
  }
  next();
});

module.exports = mongoose.model('LeadQueue', leadQueueSchema);
