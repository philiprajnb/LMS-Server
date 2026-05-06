const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const agentSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    maxlength: [100, 'Agent name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Agent email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [100, 'Agent email cannot be more than 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  region: {
    type: String,
    trim: true,
    maxlength: [50, 'Region cannot be more than 50 characters'],
    default: 'Global'
  },
  max_capacity: {
    type: Number,
    min: [1, 'Max capacity must be at least 1'],
    default: 50
  },
  availability: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available'
  },
  is_locked: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  // Assignment engine fields
  specialization: [{
    type: String,
    trim: true,
    maxlength: [50, 'Specialization cannot be more than 50 characters']
  }],
  preferred_sources: [{
    type: String,
    trim: true,
    maxlength: [50, 'Source cannot be more than 50 characters']
  }],
  // Territory IDs (UUIDs) this agent covers
  territory_ids: [{
    type: String,
    trim: true
  }],
  // Round-robin counter for direct round-robin assignment
  round_robin_index: {
    type: Number,
    default: 0
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

agentSchema.index({ email: 1 });
agentSchema.index({ region: 1 });
agentSchema.index({ is_active: 1 });

module.exports = mongoose.model('Agent', agentSchema);
