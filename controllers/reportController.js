const Lead = require('../models/Lead');

class ReportController {
  buildDateMatch(query) {
    const match = {
      deleted_at: { $exists: false }
    };

    if (query.from || query.to) {
      match.created_at = {};
      if (query.from) match.created_at.$gte = new Date(query.from);
      if (query.to) match.created_at.$lte = new Date(query.to);
    }

    if (query.owner_id) {
      match.assigned_to = query.owner_id;
    }

    if (query.region) {
      match['location.country'] = { $regex: query.region, $options: 'i' };
    }

    return match;
  }

  conversionMetrics = async (req, res, next) => {
    try {
      const match = this.buildDateMatch(req.query);

      const result = await Lead.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: ['$is_converted', 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } }
          }
        }
      ]);

      const data = result[0] || { total: 0, converted: 0, lost: 0, rejected: 0 };
      const conversionRate = data.total > 0 ? Number((data.converted / data.total).toFixed(4)) : 0;

      res.status(200).json({
        success: true,
        message: 'Conversion metrics retrieved successfully',
        data: {
          from: req.query.from || null,
          to: req.query.to || null,
          total_leads: data.total,
          converted_leads: data.converted,
          lost_leads: data.lost,
          rejected_leads: data.rejected,
          conversion_rate: conversionRate
        }
      });
    } catch (error) {
      next(error);
    }
  };

  leadsBySource = async (req, res, next) => {
    try {
      const match = this.buildDateMatch(req.query);

      const rows = await Lead.aggregate([
        { $match: match },
        { $group: { _id: '$lead_source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Leads by source retrieved successfully',
        data: {
          from: req.query.from || null,
          to: req.query.to || null,
          rows: rows.map(item => ({
            source: item._id || 'Unknown',
            count: item.count
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };

  leadsByStage = async (req, res, next) => {
    try {
      const match = this.buildDateMatch(req.query);

      const rows = await Lead.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Leads by stage retrieved successfully',
        data: {
          from: req.query.from || null,
          to: req.query.to || null,
          rows: rows.map(item => ({
            stage: item._id || 'Unknown',
            count: item.count
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };

  leadsByRegion = async (req, res, next) => {
    try {
      const match = this.buildDateMatch(req.query);

      const rows = await Lead.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              country: '$location.country',
              state: '$location.state'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Leads by region retrieved successfully',
        data: {
          from: req.query.from || null,
          to: req.query.to || null,
          rows: rows.map(item => ({
            country: item._id.country || 'Unknown',
            state: item._id.state || 'Unknown',
            count: item.count
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };

  agentPerformance = async (req, res, next) => {
    try {
      const match = this.buildDateMatch(req.query);

      if (req.query.agent_id) {
        match.assigned_to = req.query.agent_id;
      }

      const rows = await Lead.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$assigned_to',
            total_leads: { $sum: 1 },
            converted_leads: { $sum: { $cond: ['$is_converted', 1, 0] } },
            in_progress_leads: {
              $sum: {
                $cond: [{ $in: ['$status', ['Contacted', 'Qualified', 'Nurturing']] }, 1, 0]
              }
            }
          }
        },
        { $sort: { total_leads: -1 } }
      ]);

      res.status(200).json({
        success: true,
        message: 'Agent performance retrieved successfully',
        data: {
          from: req.query.from || null,
          to: req.query.to || null,
          rows: rows.map(item => ({
            agent_id: item._id || null,
            total_leads: item.total_leads,
            converted_leads: item.converted_leads,
            in_progress_leads: item.in_progress_leads,
            conversion_rate: item.total_leads > 0
              ? Number((item.converted_leads / item.total_leads).toFixed(4))
              : 0
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ReportController();
