const { createLeadSchema, updateLeadSchema, querySchema, uuidSchema } = require('../utils/validation');

// Generic validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                 source === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Specific validation middlewares
const validateCreateLead = validate(createLeadSchema, 'body');
const validateUpdateLead = validate(updateLeadSchema, 'body');
const validateQueryParams = validate(querySchema, 'query');
const validateUuidParam = validate(uuidSchema, 'params');

// Custom middleware to validate UUID in params
const validateLeadId = (req, res, next) => {
  const { error } = uuidSchema.validate(req.params.id);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid lead ID format',
      errors: [{ field: 'id', message: 'Must be a valid UUID' }]
    });
  }
  
  next();
};

module.exports = {
  validate,
  validateCreateLead,
  validateUpdateLead,
  validateQueryParams,
  validateUuidParam,
  validateLeadId
};