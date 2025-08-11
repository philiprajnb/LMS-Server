// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = [];

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
    errors = [{ field: 'id', message: 'Invalid ID format' }];
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Conflict';
    const field = Object.keys(err.keyValue)[0];
    errors = [{ field, message: `A ${field} with this value already exists` }];
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errors = [{ field: 'token', message: 'Invalid authentication token' }];
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errors = [{ field: 'token', message: 'Authentication token has expired' }];
  }

  // Handle specific error types
  if (err.message === 'A lead with this email already exists') {
    statusCode = 409;
    message = 'Conflict';
    errors = [{ field: 'email', message: err.message }];
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

