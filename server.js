require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes and middleware
const leadRoutes = require('./routes/leadRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Connect to database
connectDB();

const app = express();


// Security middleware
app.use(helmet());


// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/leads', leadRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Lead Management System API',
    version: '1.0.0',
    endpoints: {
      leads: {
        'POST /api/leads': 'Create a new lead',
        'GET /api/leads': 'Get all leads with filtering, pagination, and sorting',
        'GET /api/leads/stats': 'Get lead statistics',
        'GET /api/leads/:id': 'Get a specific lead by ID',
        'PUT /api/leads/:id': 'Update a specific lead',
        'DELETE /api/leads/:id': 'Soft delete a specific lead',
        'DELETE /api/leads/:id/hard': 'Permanently delete a specific lead',
        'POST /api/leads/bulk/update': 'Bulk update multiple leads',
        'POST /api/leads/bulk/delete': 'Bulk delete multiple leads'
      }
    },
    schema: {
      lead: {
        id: 'UUID',
        first_name: 'string (required)',
        last_name: 'string (required)',
        email: 'string (required, unique)',
        phone: 'string (optional)',
        company: 'string (required)',
        job_title: 'string (optional)',
        lead_source: 'string (required)',
        status: 'enum: New, Contacted, Qualified, Lost, Converted',
        lead_score: 'integer (0-100, optional)',
        industry: 'string (optional)',
        location: {
          city: 'string (optional)',
          state: 'string (optional)',
          country: 'string (optional)'
        },
        notes: 'text (optional)',
        assigned_to: 'UUID (optional)',
        next_follow_up: 'timestamp (optional)',
        priority: 'enum: Low, Medium, High (optional)',
        tags: 'array of strings (optional)',
        deal_stage: 'string (optional)',
        account_id: 'UUID (optional)',
        custom_fields: 'JSON (optional)',
        source_campaign: 'string (optional)',
        communication_channel: 'string (optional)',
        is_converted: 'boolean (optional)',
        converted_at: 'timestamp (optional)',
        created_by: 'UUID (optional)',
        created_at: 'timestamp (auto-generated)',
        updated_at: 'timestamp (auto-updated)',
        deleted_at: 'timestamp (soft delete)'
      }
    }
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lead Management System API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📡 Environment: ${process.env.NODE_ENV || 'development'}
🔗 API Base URL: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/api/health
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception thrown:', err);
  process.exit(1);

});

module.exports = app;