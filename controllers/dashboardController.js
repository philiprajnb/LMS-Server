const Lead = require('../models/Lead');
const AuditLog = require('../models/AuditLog');
const LeadQueue = require('../models/LeadQueue');

class DashboardController {
  getSummary = async (req, res, next) => {
    try {
      const { from, to, owner_id, region } = req.query;

      const baseMatch = {
        deleted_at: { $exists: false }
      };

      if (from || to) {
        baseMatch.created_at = {};
        if (from) baseMatch.created_at.$gte = new Date(from);
        if (to) baseMatch.created_at.$lte = new Date(to);
      }

      if (owner_id) {
        baseMatch.assigned_to = owner_id;
      }

      if (region) {
        baseMatch['location.country'] = { $regex: region, $options: 'i' };
      }

      const [
        kpiResult,
        priorityDistribution,
        sourceBreakdown,
        channelBreakdown,
        recentActivity,
        topPriorityQueue,
        hotCount,
        warmCount,
        coldCount,
        queueOwnedCount,
        agentOwnedCount,
        unassignedCount,
        slaBreachedCount,
        activeQueues
      ] = await Promise.all([
        Lead.aggregate([
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              total_leads: { $sum: 1 },
              new_leads: { $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] } },
              assigned_leads: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$assigned_to', null] },
                        { $ne: ['$assigned_to', ''] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              in_progress_leads: {
                $sum: {
                  $cond: [{ $in: ['$status', ['Contacted', 'Qualified', 'Nurturing']] }, 1, 0]
                }
              },
              converted_leads: { $sum: { $cond: ['$is_converted', 1, 0] } },
              lost_or_rejected_leads: {
                $sum: {
                  $cond: [{ $in: ['$status', ['Lost', 'Rejected']] }, 1, 0]
                }
              },
              unassigned_leads: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$assigned_to', null] },
                        { $eq: ['$assigned_to', ''] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]),
        Lead.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Lead.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$lead_source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Lead.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$communication_channel', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Lead.find(baseMatch)
          .sort({ updated_at: -1 })
          .limit(10)
          .select('id status priority assigned_to lead_score updated_at first_name last_name'),
        Lead.find(baseMatch)
          .sort({ priority: -1, lead_score: -1, updated_at: -1 })
          .limit(10)
          .select('id first_name last_name priority lead_score status assigned_to updated_at'),
        Lead.countDocuments({ ...baseMatch, lead_score: { $gte: 70, $lte: 100 } }),
        Lead.countDocuments({ ...baseMatch, lead_score: { $gte: 40, $lte: 69 } }),
        Lead.countDocuments({ ...baseMatch, lead_score: { $gte: 0, $lte: 39 } }),
        // Assignment engine KPIs
        Lead.countDocuments({ ...baseMatch, owner_type: 'queue' }),
        Lead.countDocuments({ ...baseMatch, owner_type: 'agent' }),
        Lead.countDocuments({ ...baseMatch, owner_type: 'unassigned' }),
        Lead.countDocuments({ ...baseMatch, sla_due_at: { $lt: new Date() }, owner_type: 'queue' }),
        LeadQueue.find({ is_active: true }).select('id name is_default current_size max_size sla_hours').lean()
      ]);

      const leadIdsInScope = await Lead.find(baseMatch).select('id -_id');

      const reassignFilter = {
        action: 'reassign',
        entity_type: 'lead',
        entity_id: { $in: leadIdsInScope.map(item => item.id) }
      };

      if (from || to) {
        reassignFilter.created_at = {};
        if (from) reassignFilter.created_at.$gte = new Date(from);
        if (to) reassignFilter.created_at.$lte = new Date(to);
      }

      const reassignedLeads = await AuditLog.countDocuments(reassignFilter);

      const kpis = kpiResult[0] || {
        total_leads: 0,
        new_leads: 0,
        assigned_leads: 0,
        in_progress_leads: 0,
        converted_leads: 0,
        lost_or_rejected_leads: 0,
        unassigned_leads: 0
      };

      res.status(200).json({
        success: true,
        message: 'Dashboard summary retrieved successfully',
        data: {
          kpis: {
            ...kpis,
            reassigned_leads: reassignedLeads,
            queue_owned: queueOwnedCount,
            agent_owned: agentOwnedCount,
            truly_unassigned: unassignedCount,
            sla_breached: slaBreachedCount
          },
          priority_distribution: priorityDistribution.map(item => ({
            priority: item._id || 'Unknown',
            count: item.count
          })),
          temperature_distribution: [
            { bucket: 'hot', count: hotCount },
            { bucket: 'warm', count: warmCount },
            { bucket: 'cold', count: coldCount }
          ],
          source_breakdown: sourceBreakdown.map(item => ({
            source: item._id || 'Unknown',
            count: item.count
          })),
          channel_breakdown: channelBreakdown.map(item => ({
            channel: item._id || 'Unknown',
            count: item.count
          })),
          recent_activity: recentActivity.map(lead => ({
            lead_id: lead.id,
            event: 'lead_updated',
            to_status: lead.status,
            at: lead.updated_at,
            actor_id: null
          })),
          top_priority_queue: topPriorityQueue.map(lead => ({
            id: lead.id,
            full_name: `${lead.first_name} ${lead.last_name}`,
            priority: lead.priority,
            lead_score: lead.lead_score,
            status: lead.status,
            assigned_to: lead.assigned_to,
            updated_at: lead.updated_at
          })),
          active_queues: activeQueues
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new DashboardController();
