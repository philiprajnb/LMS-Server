const Agent = require('../models/Agent');
const Lead = require('../models/Lead');
const AuditLog = require('../models/AuditLog');

class AgentController {
  listAgents = async (req, res, next) => {
    try {
      const { region, availability, is_locked, is_active = true } = req.query;

      const filter = {};
      if (region) filter.region = { $regex: region, $options: 'i' };
      if (availability) filter.availability = availability;
      if (typeof is_locked !== 'undefined') filter.is_locked = is_locked;
      if (typeof is_active !== 'undefined') filter.is_active = is_active;

      const agents = await Agent.find(filter).sort({ created_at: -1 });

      const agentsWithMetrics = await Promise.all(
        agents.map(async agent => {
          const activeLeadCount = await Lead.countDocuments({
            assigned_to: agent.id,
            status: { $in: ['New', 'Contacted', 'Qualified', 'Nurturing'] },
            deleted_at: { $exists: false }
          });

          return {
            ...agent.toObject(),
            active_lead_count: activeLeadCount
          };
        })
      );

      res.status(200).json({
        success: true,
        message: 'Agents retrieved successfully',
        data: agentsWithMetrics
      });
    } catch (error) {
      next(error);
    }
  };

  getAgentById = async (req, res, next) => {
    try {
      const agent = await Agent.findOne({ id: req.params.id, is_active: true });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const activeLeadCount = await Lead.countDocuments({
        assigned_to: agent.id,
        status: { $in: ['New', 'Contacted', 'Qualified', 'Nurturing'] },
        deleted_at: { $exists: false }
      });

      res.status(200).json({
        success: true,
        message: 'Agent retrieved successfully',
        data: {
          ...agent.toObject(),
          active_lead_count: activeLeadCount
        }
      });
    } catch (error) {
      next(error);
    }
  };

  createAgent = async (req, res, next) => {
    try {
      const agent = new Agent(req.body);
      await agent.save();

      res.status(201).json({
        success: true,
        message: 'Agent created successfully',
        data: agent
      });
    } catch (error) {
      next(error);
    }
  };

  updateAgent = async (req, res, next) => {
    try {
      const agent = await Agent.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true, runValidators: true }
      );

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Agent updated successfully',
        data: agent
      });
    } catch (error) {
      next(error);
    }
  };

  getCapacity = async (req, res, next) => {
    try {
      const agent = await Agent.findOne({ id: req.params.id, is_active: true });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const activeLeadCount = await Lead.countDocuments({
        assigned_to: agent.id,
        status: { $in: ['New', 'Contacted', 'Qualified', 'Nurturing'] },
        deleted_at: { $exists: false }
      });

      const remainingCapacity = Math.max(0, agent.max_capacity - activeLeadCount);

      res.status(200).json({
        success: true,
        message: 'Agent capacity retrieved successfully',
        data: {
          agent_id: agent.id,
          max_capacity: agent.max_capacity,
          active_lead_count: activeLeadCount,
          remaining_capacity: remainingCapacity,
          is_over_capacity: activeLeadCount > agent.max_capacity
        }
      });
    } catch (error) {
      next(error);
    }
  };

  assignLeads = async (req, res, next) => {
    try {
      const { lead_ids = [], reason } = req.body;
      const { id } = req.params;

      if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'lead_ids must be a non-empty array'
        });
      }

      const agent = await Agent.findOne({ id, is_active: true });
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const leads = await Lead.find({ id: { $in: lead_ids }, deleted_at: { $exists: false } });
      const foundIds = new Set(leads.map(lead => lead.id));

      let assigned = 0;
      let skipped = 0;

      for (const lead of leads) {
        if (lead.assigned_to === id) {
          skipped += 1;
          continue;
        }

        const previousOwner = lead.assigned_to || null;
        lead.assigned_to = id;
        await lead.save();
        assigned += 1;

        await AuditLog.create({
          actor_id: req.user?.id,
          actor_role: req.user?.role,
          action: 'assign',
          entity_type: 'lead',
          entity_id: lead.id,
          changes: {
            assigned_to: {
              from: previousOwner,
              to: id
            }
          },
          reason,
          metadata: {
            ip: req.ip,
            user_agent: req.get('User-Agent')
          }
        });
      }

      const missingLeadIds = lead_ids.filter(leadId => !foundIds.has(leadId));

      res.status(200).json({
        success: true,
        message: 'Lead assignment completed',
        data: {
          agent_id: id,
          assigned,
          skipped,
          missing_lead_ids: missingLeadIds
        }
      });
    } catch (error) {
      next(error);
    }
  };

  reassignLeads = async (req, res, next) => {
    try {
      const { lead_ids = [], from_agent_id, reason } = req.body;
      const toAgentId = req.params.id;

      if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'lead_ids must be a non-empty array'
        });
      }

      const toAgent = await Agent.findOne({ id: toAgentId, is_active: true });
      if (!toAgent) {
        return res.status(404).json({
          success: false,
          message: 'Target agent not found'
        });
      }

      const filter = {
        id: { $in: lead_ids },
        deleted_at: { $exists: false }
      };

      if (from_agent_id) {
        filter.assigned_to = from_agent_id;
      }

      const leads = await Lead.find(filter);
      const foundIds = new Set(leads.map(lead => lead.id));

      let reassigned = 0;
      let skipped = 0;

      for (const lead of leads) {
        if (lead.assigned_to === toAgentId) {
          skipped += 1;
          continue;
        }

        const previousOwner = lead.assigned_to || null;
        lead.assigned_to = toAgentId;
        await lead.save();
        reassigned += 1;

        await AuditLog.create({
          actor_id: req.user?.id,
          actor_role: req.user?.role,
          action: 'reassign',
          entity_type: 'lead',
          entity_id: lead.id,
          changes: {
            assigned_to: {
              from: previousOwner,
              to: toAgentId
            }
          },
          reason,
          metadata: {
            ip: req.ip,
            user_agent: req.get('User-Agent')
          }
        });
      }

      const missingLeadIds = lead_ids.filter(leadId => !foundIds.has(leadId));

      res.status(200).json({
        success: true,
        message: 'Lead reassignment completed',
        data: {
          to_agent_id: toAgentId,
          from_agent_id: from_agent_id || null,
          reassigned,
          skipped,
          missing_lead_ids: missingLeadIds
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AgentController();
