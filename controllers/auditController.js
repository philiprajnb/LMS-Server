const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Lead = require('../models/Lead');

class AuditController {
  listAuditLogs = async (req, res, next) => {
    try {
      const {
        actor_id,
        entity_type,
        entity_id,
        action,
        from,
        to,
        page = 1,
        limit = 20
      } = req.query;

      const filter = {};

      if (actor_id) filter.actor_id = actor_id;
      if (entity_type) filter.entity_type = entity_type;
      if (entity_id) filter.entity_id = entity_id;
      if (action) filter.action = action;

      if (from || to) {
        filter.created_at = {};
        if (from) filter.created_at.$gte = new Date(from);
        if (to) filter.created_at.$lte = new Date(to);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [logs, totalItems] = await Promise.all([
        AuditLog.find(filter)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        AuditLog.countDocuments(filter)
      ]);

      // Enrich logs with actor username and entity name
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const logObj = log.toObject();
          
          // Fetch actor (user) name
          if (logObj.actor_id) {
            try {
              const user = await User.findById(logObj.actor_id).select('name');
              logObj.actor_username = user && user.name ? user.name : 'Unknown';
            } catch (e) {
              logObj.actor_username = 'Unknown';
            }
          }
          
          // Fetch entity (lead) name if entity_type is 'lead'
          if (logObj.entity_type === 'lead' && logObj.entity_id) {
            try {
              const lead = await Lead.findOne({ id: logObj.entity_id }).select('first_name last_name');
              logObj.entity_display = lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Lead';
            } catch (e) {
              logObj.entity_display = 'Unknown Lead';
            }
          } else {
            logObj.entity_display = logObj.entity_id;
          }
          
          return logObj;
        })
      );

      const totalPages = Math.ceil(totalItems / parseInt(limit));

      res.status(200).json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: enrichedLogs,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_items: totalItems,
          total_pages: totalPages,
          has_next_page: parseInt(page) < totalPages,
          has_prev_page: parseInt(page) > 1
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new AuditController();
