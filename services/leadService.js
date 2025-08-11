const Lead = require('../models/Lead');

class LeadService {
  // Create a new lead
  async create(leadData) {
    try {
      const lead = new Lead(leadData);
      await lead.save();
      return lead;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('A lead with this email already exists');
      }
      throw error;
    }
  }

  // Get all leads with filtering, pagination, and sorting
  async findAll(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        priority,
        assigned_to,
        company_name,
        lead_source,
        is_converted,
        industry,
        role_in_decision,
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = queryParams;

      // Build filter object
      const filter = {};
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (assigned_to) filter.assigned_to = assigned_to;
      if (company_name) filter.company_name = { $regex: company_name, $options: 'i' };
      if (lead_source) filter.lead_source = lead_source;
      if (is_converted !== undefined) filter.is_converted = is_converted;
      if (industry) filter.industry = { $regex: industry, $options: 'i' };
      if (role_in_decision) filter.role_in_decision = role_in_decision;

      // Text search across multiple fields
      if (search) {
        filter.$or = [
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { company_name: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sort_by] = sort_order === 'asc' ? 1 : -1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      const [leads, totalItems] = await Promise.all([
        Lead.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Lead.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        leads,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_items: totalItems,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get a single lead by ID
  async findById(id) {
    try {
      const lead = await Lead.findOne({ id });
      return lead;
    } catch (error) {
      throw error;
    }
  }

  // Update a lead
  async update(id, updateData) {
    try {
      const lead = await Lead.findOne({ id });
      if (!lead) {
        return null;
      }

      const updatedLead = await lead.updateLead(updateData);
      return updatedLead;
    } catch (error) {
      throw error;
    }
  }

  // Delete a lead (soft delete)
  async delete(id) {
    try {
      const lead = await Lead.findOne({ id });
      if (!lead) {
        return null;
      }

      await lead.softDelete();
      return lead;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete a lead
  async hardDelete(id) {
    try {
      const lead = await Lead.findOneAndDelete({ id });
      return lead;
    } catch (error) {
      throw error;
    }
  }

  // Get lead statistics
  async getStats() {
    try {
      const stats = await Lead.aggregate([
        {
          $group: {
            _id: null,
            total_leads: { $sum: 1 },
            converted_leads: { $sum: { $cond: ['$is_converted', 1, 0] } },
            new_leads: { $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] } },
            contacted_leads: { $sum: { $cond: [{ $eq: ['$status', 'Contacted'] }, 1, 0] } },
            qualified_leads: { $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] } },
            lost_leads: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } }
          }
        }
      ]);

      const statusDistribution = await Lead.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const priorityDistribution = await Lead.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const industryDistribution = await Lead.aggregate([
        {
          $match: { industry: { $exists: true, $ne: null } }
        },
        {
          $group: {
            _id: '$industry',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        overview: stats[0] || {
          total_leads: 0,
          converted_leads: 0,
          new_leads: 0,
          contacted_leads: 0,
          qualified_leads: 0,
          lost_leads: 0
        },
        status_distribution: statusDistribution,
        priority_distribution: priorityDistribution,
        industry_distribution: industryDistribution
      };
    } catch (error) {
      throw error;
    }
  }

  // Bulk update leads
  async bulkUpdate(leadIds, updateData) {
    try {
      const result = await Lead.updateMany(
        { id: { $in: leadIds } },
        { ...updateData, updated_at: new Date() }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Bulk delete leads
  async bulkDelete(leadIds) {
    try {
      const result = await Lead.updateMany(
        { id: { $in: leadIds } },
        { deleted_at: new Date(), updated_at: new Date() }
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = LeadService;