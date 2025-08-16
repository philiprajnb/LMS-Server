const LeadService = require('../services/leadService');

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
}

module.exports = LeadController;