const LeadService = require('../services/leadService');
const Lead = require('../models/Lead');
const { autoAssignLead, suggestAgentsForLead } = require('../services/assignmentRuleEngine');

class LeadController {
  constructor() {
    this.leadService = new LeadService();
  }

  // Create a new lead
  createLead = async (req, res, next) => {
    try {
      const lead = await this.leadService.create(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        data: lead
      });
    } catch (error) {
      next(error);
    }
  };

  // Get all leads with filtering, pagination, and sorting
  getAllLeads = async (req, res, next) => {
    try {
      const result = await this.leadService.findAll(req.query);
      
      res.status(200).json({
        success: true,
        message: 'Leads retrieved successfully',
        data: result.leads,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  };

  // Get a single lead by ID
  getLeadById = async (req, res, next) => {
    try {
      const lead = await this.leadService.findById(req.params.id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lead retrieved successfully',
        data: lead
      });
    } catch (error) {
      next(error);
    }
  };

  // Update a lead
  updateLead = async (req, res, next) => {
    try {
      const lead = await this.leadService.update(req.params.id, req.body);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lead updated successfully',
        data: lead
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete a lead (soft delete)
  deleteLead = async (req, res, next) => {
    try {
      const lead = await this.leadService.delete(req.params.id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lead deleted successfully',
        data: lead
      });
    } catch (error) {
      next(error);
    }
  };

  // Permanently delete a lead (hard delete)
  hardDeleteLead = async (req, res, next) => {
    try {
      const deleted = await this.leadService.hardDelete(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lead permanently deleted'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get lead statistics
  getLeadStats = async (req, res, next) => {
    try {
      const stats = await this.leadService.getStats();
      
      res.status(200).json({
        success: true,
        message: 'Lead statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  // Bulk operations
  bulkUpdateLeads = async (req, res, next) => {
    try {
      const { lead_ids, update_data } = req.body;
      const results = [];

      for (const id of lead_ids) {
        try {
          const lead = await this.leadService.update(id, update_data);
          if (lead) {
            results.push({ id, success: true, data: lead });
          } else {
            results.push({ id, success: false, message: 'Lead not found' });
          }
        } catch (error) {
          results.push({ id, success: false, message: error.message });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Bulk update completed',
        data: results
      });
    } catch (error) {
      next(error);
    }
  };

  // Bulk delete leads
  bulkDeleteLeads = async (req, res, next) => {
    try {
      const { lead_ids } = req.body;
      const results = [];

      for (const id of lead_ids) {
        try {
          const lead = await this.leadService.delete(id);
          if (lead) {
            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, message: 'Lead not found' });
          }
        } catch (error) {
          results.push({ id, success: false, message: error.message });
        }
      }

      res.status(200).json({
        success: true,
        message: 'Bulk delete completed',
        data: results
      });
    } catch (error) {
      next(error);
    }
  };

  // Get lead scoring analysis
  getLeadScoring = async (req, res, next) => {
    try {
      const lead = await this.leadService.findById(req.params.id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const LeadScoringService = require('../services/leadScoringService');
      const scoringService = new LeadScoringService();
      
      const scoringBreakdown = scoringService.getScoringBreakdown(lead);
      
      res.json({
        success: true,
        message: 'Lead scoring analysis retrieved successfully',
        data: {
          lead_id: lead.id,
          current_score: lead.lead_score || 0,
          classification: scoringBreakdown.classification,
          breakdown: scoringBreakdown,
          scoring_metadata: lead.scoring_metadata
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Get lead scoring recommendations
  getLeadRecommendations = async (req, res, next) => {
    try {
      const lead = await this.leadService.findById(req.params.id);
      
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const LeadScoringService = require('../services/leadScoringService');
      const scoringService = new LeadScoringService();
      
      const recommendations = scoringService.getScoringRecommendations(lead);
      
      res.json({
        success: true,
        message: 'Lead scoring recommendations retrieved successfully',
        data: {
          lead_id: lead.id,
          current_score: lead.lead_score || 0,
          recommendations: recommendations,
          potential_score_increase: recommendations.reduce((sum, rec) => sum + rec.potential_score_increase, 0)
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Bulk score leads
  bulkScoreLeads = async (req, res, next) => {
    try {
      const { leadIds } = req.body;
      
      if (!leadIds || !Array.isArray(leadIds)) {
        return res.status(400).json({
          success: false,
          message: 'Lead IDs array is required'
        });
      }

      const LeadScoringService = require('../services/leadScoringService');
      const scoringService = new LeadScoringService();
      
      const leads = [];
      for (const id of leadIds) {
        const lead = await this.leadService.findById(id);
        if (lead) {
          leads.push(lead);
        }
      }

      const updatedLeads = await scoringService.batchUpdateScores(leads);
      
      // Save updated leads
      for (const lead of updatedLeads) {
        await lead.save();
      }
      
      res.json({
        success: true,
        message: `${updatedLeads.length} leads scored successfully`,
        data: {
          scoredCount: updatedLeads.length,
          leads: updatedLeads.map(lead => ({
            id: lead.id,
            lead_score: lead.lead_score,
            classification: lead.scoring_metadata?.classification
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Get leads by classification (Hot, Warm, Cold, Disqualified)
  getLeadsByClassification = async (req, res, next) => {
    try {
      const { type } = req.params;
      const { page = 1, limit = 10, sort_by = 'lead_score', sort_order = 'desc' } = req.query;

      // Validate classification type
      const validTypes = ['hot', 'warm', 'cold', 'disqualified'];
      if (!validTypes.includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid classification type. Must be: hot, warm, cold, or disqualified'
        });
      }

      // Define score ranges for each classification
      const scoreRanges = {
        hot: { min: 70, max: 100 },
        warm: { min: 40, max: 69 },
        cold: { min: 0, max: 39 },
        disqualified: { min: -100, max: -1 }
      };

      const range = scoreRanges[type.toLowerCase()];
      
      // Build filter for score range
      const filter = {
        lead_score: { $gte: range.min, $lte: range.max }
      };

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      const [leads, totalItems] = await Promise.all([
        Lead.find(filter)
          .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Lead.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} leads retrieved successfully`,
        data: {
          classification: type.toLowerCase(),
          score_range: range,
          leads: leads,
          pagination: {
            current_page: parseInt(page),
            per_page: parseInt(limit),
            total_items: totalItems,
            total_pages: totalPages,
            has_next_page: page < totalPages,
            has_prev_page: page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Get statistics for a specific classification
  getClassificationStats = async (req, res, next) => {
    try {
      const { type } = req.params;

      // Validate classification type
      const validTypes = ['hot', 'warm', 'cold', 'disqualified'];
      if (!validTypes.includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid classification type. Must be: hot, warm, cold, or disqualified'
        });
      }

      // Define score ranges for each classification
      const scoreRanges = {
        hot: { min: 70, max: 100 },
        warm: { min: 40, max: 69 },
        cold: { min: 0, max: 39 },
        disqualified: { min: -100, max: -1 }
      };

      const range = scoreRanges[type.toLowerCase()];

      // Get detailed statistics for the classification
      const stats = await Lead.aggregate([
        {
          $match: {
            lead_score: { $gte: range.min, $lte: range.max }
          }
        },
        {
          $group: {
            _id: null,
            total_leads: { $sum: 1 },
            average_score: { $avg: '$lead_score' },
            min_score: { $min: '$lead_score' },
            max_score: { $max: '$lead_score' },
            by_status: { $push: '$status' },
            by_priority: { $push: '$priority' },
            by_industry: { $push: '$industry' },
            by_role: { $push: '$role_in_decision' }
          }
        }
      ]);

      // Get status distribution
      const statusDistribution = await Lead.aggregate([
        {
          $match: {
            lead_score: { $gte: range.min, $lte: range.max }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get priority distribution
      const priorityDistribution = await Lead.aggregate([
        {
          $match: {
            lead_score: { $gte: range.min, $lte: range.max }
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get industry distribution
      const industryDistribution = await Lead.aggregate([
        {
          $match: {
            lead_score: { $gte: range.min, $lte: range.max },
            industry: { $exists: true, $ne: null }
          }
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

      const result = {
        classification: type.toLowerCase(),
        score_range: range,
        overview: stats[0] || {
          total_leads: 0,
          average_score: 0,
          min_score: 0,
          max_score: 0
        },
        status_distribution: statusDistribution,
        priority_distribution: priorityDistribution,
        industry_distribution: industryDistribution
      };

      res.json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} leads statistics retrieved successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/leads/:id/auto-assign
   * Run a single lead through the rule engine.
   */
  autoAssignLead = async (req, res, next) => {
    try {
      const lead = await Lead.findOne({ id: req.params.id });
      if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

      const result = await autoAssignLead(lead, req.user.id);
      res.json({ success: true, message: 'Lead assigned successfully', data: result });
    } catch (err) {
      const statusCode = err.code === 'AGENT_AT_CAPACITY' ? 409
                       : err.code === 'NO_DEFAULT_QUEUE'   ? 422
                       : err.code === 'QUEUE_FULL'         ? 409
                       : 400;
      if (err.code) return res.status(statusCode).json({ success: false, message: err.message, code: err.code });
      next(err);
    }
  };

  /**
   * POST /api/leads/bulk/auto-assign
   * Body: { lead_ids: [...] } or omit for all unassigned leads.
   */
  bulkAutoAssignLeads = async (req, res, next) => {
    try {
      const { lead_ids } = req.body || {};

      let filter;
      if (lead_ids && Array.isArray(lead_ids) && lead_ids.length > 0) {
        filter = { id: { $in: lead_ids }, deleted_at: { $exists: false } };
      } else {
        filter = { owner_type: 'unassigned', deleted_at: { $exists: false } };
      }

      const leads = await Lead.find(filter).limit(200);
      if (leads.length === 0) {
        return res.json({ success: true, message: 'No leads to assign', data: { assigned: 0, failed: 0, results: [] } });
      }

      const results = await Promise.allSettled(
        leads.map(lead => autoAssignLead(lead, req.user.id).then(r => ({ lead_id: lead.id, ...r })))
      );

      const summary = results.reduce((acc, r) => {
        if (r.status === 'fulfilled') {
          acc.assigned++;
          acc.results.push({ lead_id: r.value.lead_id, status: 'assigned', ...r.value });
        } else {
          acc.failed++;
          acc.results.push({ lead_id: null, status: 'failed', error: r.reason?.message || 'Unknown error' });
        }
        return acc;
      }, { assigned: 0, failed: 0, results: [] });

      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/leads/:id/suggested-agents
   * Returns ranked list of agents best suited for this lead.
   */
  getSuggestedAgents = async (req, res, next) => {
    try {
      const lead = await Lead.findOne({ id: req.params.id });
      if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

      const limit = Math.min(parseInt(req.query.limit) || 5, 20);
      const suggestions = await suggestAgentsForLead(lead, limit);
      res.json({ success: true, data: suggestions });
    } catch (error) {
      next(error);
    }
  };
}module.exports = LeadController;
