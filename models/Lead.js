const { v4: uuidv4 } = require('uuid');

class Lead {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.phone = data.phone || null;
    this.company = data.company;
    this.job_title = data.job_title || null;
    this.lead_source = data.lead_source;
    this.status = data.status || 'New';
    this.lead_score = data.lead_score || null;
    this.industry = data.industry || null;
    this.location = data.location || {};
    this.notes = data.notes || null;
    this.assigned_to = data.assigned_to || null;
    this.next_follow_up = data.next_follow_up || null;
    this.priority = data.priority || null;
    this.tags = data.tags || [];
    this.deal_stage = data.deal_stage || null;
    this.account_id = data.account_id || null;
    this.custom_fields = data.custom_fields || {};
    this.source_campaign = data.source_campaign || null;
    this.communication_channel = data.communication_channel || null;
    this.is_converted = data.is_converted || false;
    this.converted_at = data.converted_at || null;
    this.created_by = data.created_by || null;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.deleted_at = data.deleted_at || null;
  }

  // Update the lead with new data
  update(data) {
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'company', 'job_title',
      'lead_source', 'status', 'lead_score', 'industry', 'location', 'notes',
      'assigned_to', 'next_follow_up', 'priority', 'tags', 'deal_stage',
      'account_id', 'custom_fields', 'source_campaign', 'communication_channel',
      'is_converted', 'converted_at', 'created_by'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        this[field] = data[field];
      }
    });

    this.updated_at = new Date().toISOString();
  }

  // Soft delete the lead
  softDelete() {
    this.deleted_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  // Convert to JSON (excluding deleted leads by default)
  toJSON() {
    const obj = { ...this };
    return obj;
  }

  // Static method to get valid status values
  static getValidStatuses() {
    return ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];
  }

  // Static method to get valid priority values
  static getValidPriorities() {
    return ['Low', 'Medium', 'High'];
  }
}

module.exports = Lead;