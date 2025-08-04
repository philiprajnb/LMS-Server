const Lead = require('../models/Lead');

class LeadService {
  constructor() {
    // In-memory storage (in production, this would be a database)
    this.leads = new Map();
    this.emailIndex = new Map(); // For email uniqueness check
  }

  // Create a new lead
  async create(leadData) {
    // Check if email already exists (if email uniqueness is required)
    if (leadData.email && this.emailIndex.has(leadData.email.toLowerCase())) {
      throw new Error('A lead with this email already exists');
    }

    const lead = new Lead(leadData);
    this.leads.set(lead.id, lead);
    
    // Index email for uniqueness
    if (lead.email) {
      this.emailIndex.set(lead.email.toLowerCase(), lead.id);
    }

    return lead;
  }

  // Get all leads with filtering, pagination, and sorting
  async findAll(queryParams = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      assigned_to,
      company,
      lead_source,
      is_converted,
      search,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = queryParams;

    let filteredLeads = Array.from(this.leads.values())
      .filter(lead => !lead.deleted_at); // Exclude soft-deleted leads

    // Apply filters
    if (status) {
      filteredLeads = filteredLeads.filter(lead => lead.status === status);
    }
    if (priority) {
      filteredLeads = filteredLeads.filter(lead => lead.priority === priority);
    }
    if (assigned_to) {
      filteredLeads = filteredLeads.filter(lead => lead.assigned_to === assigned_to);
    }
    if (company) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.company.toLowerCase().includes(company.toLowerCase())
      );
    }
    if (lead_source) {
      filteredLeads = filteredLeads.filter(lead => lead.lead_source === lead_source);
    }
    if (is_converted !== undefined) {
      filteredLeads = filteredLeads.filter(lead => lead.is_converted === is_converted);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead => 
        lead.first_name.toLowerCase().includes(searchLower) ||
        lead.last_name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.company.toLowerCase().includes(searchLower) ||
        (lead.notes && lead.notes.toLowerCase().includes(searchLower))
      );
    }

    // Sort leads
    filteredLeads.sort((a, b) => {
      let aValue = a[sort_by];
      let bValue = b[sort_by];

      // Handle different data types
      if (sort_by === 'created_at' || sort_by === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue ? bValue.toLowerCase() : '';
      }

      if (sort_order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const total = filteredLeads.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    return {
      leads: paginatedLeads,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
        has_next_page: endIndex < total,
        has_prev_page: page > 1
      }
    };
  }

  // Get a single lead by ID
  async findById(id) {
    const lead = this.leads.get(id);
    if (!lead || lead.deleted_at) {
      return null;
    }
    return lead;
  }

  // Update a lead
  async update(id, updateData) {
    const lead = await this.findById(id);
    if (!lead) {
      return null;
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== lead.email) {
      const emailLower = updateData.email.toLowerCase();
      if (this.emailIndex.has(emailLower)) {
        throw new Error('A lead with this email already exists');
      }
      
      // Update email index
      if (lead.email) {
        this.emailIndex.delete(lead.email.toLowerCase());
      }
      this.emailIndex.set(emailLower, lead.id);
    }

    lead.update(updateData);
    return lead;
  }

  // Soft delete a lead
  async delete(id) {
    const lead = await this.findById(id);
    if (!lead) {
      return null;
    }

    lead.softDelete();
    
    // Remove from email index
    if (lead.email) {
      this.emailIndex.delete(lead.email.toLowerCase());
    }

    return lead;
  }

  // Hard delete a lead (permanent removal)
  async hardDelete(id) {
    const lead = this.leads.get(id);
    if (!lead) {
      return false;
    }

    // Remove from email index
    if (lead.email) {
      this.emailIndex.delete(lead.email.toLowerCase());
    }

    this.leads.delete(id);
    return true;
  }

  // Get lead statistics
  async getStats() {
    const activeLeads = Array.from(this.leads.values())
      .filter(lead => !lead.deleted_at);

    const stats = {
      total_leads: activeLeads.length,
      by_status: {},
      by_priority: {},
      converted_count: 0,
      average_lead_score: 0
    };

    let totalScore = 0;
    let scoredLeads = 0;

    activeLeads.forEach(lead => {
      // Count by status
      stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;

      // Count by priority
      if (lead.priority) {
        stats.by_priority[lead.priority] = (stats.by_priority[lead.priority] || 0) + 1;
      }

      // Count converted leads
      if (lead.is_converted) {
        stats.converted_count++;
      }

      // Calculate average lead score
      if (lead.lead_score !== null) {
        totalScore += lead.lead_score;
        scoredLeads++;
      }
    });

    if (scoredLeads > 0) {
      stats.average_lead_score = Math.round(totalScore / scoredLeads);
    }

    return stats;
  }
}

module.exports = LeadService;