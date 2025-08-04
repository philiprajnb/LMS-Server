// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = [];

  // Handle specific error types
  if (err.message === 'A lead with this email already exists') {
    statusCode = 409;
    message = 'Conflict';
    errors = [{ field: 'email', message: err.message }];
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = [{ field: 'general', message: err.message }];
  } else if (err.message.includes('UUID')) {
    statusCode = 400;
    message = 'Invalid ID format';
    errors = [{ field: 'id', message: 'Must be a valid UUID' }];
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};