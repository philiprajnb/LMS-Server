require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import database connection
const connectDB = require('./config/database');

// Import routes
const leadRoutes = require('./routes/leadRoutes');
const authRoutes = require('./routes/authRoutes');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

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

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
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
app.use('/api/auth', authRoutes);

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
        'POST /api/leads/bulk/delete': 'Bulk delete multiple leads',
        'GET /api/leads/:id/scoring': 'Get lead scoring analysis and breakdown',
        'GET /api/leads/:id/recommendations': 'Get lead scoring recommendations',
        'POST /api/leads/bulk/score': 'Bulk score multiple leads'
      }
    },
    schema: {
      lead: {
        id: 'UUID (auto-generated)',
        first_name: 'string (required, max 50 chars)',
        last_name: 'string (required, max 50 chars)',
        email: 'string (required, unique, max 100 chars)',
        phone: 'string (optional, max 20 chars)',
        job_title: 'string (optional, max 100 chars)',
        
        company_id: 'UUID (optional, FK to accounts table)',
        company_name: 'string (required, max 100 chars)',
        company_website: 'string (optional, max 200 chars)',
        
        role_in_decision: 'enum: Decision Maker, Influencer, End User, Champion, Gatekeeper',
        industry: 'string (optional, max 100 chars)',
        company_size: 'integer (optional, 1-1M employees)',
        annual_revenue: 'decimal (optional, non-negative)',
        
        lead_source: 'string (required, max 100 chars)',
        status: 'enum: New, Contacted, Qualified, Lost, Converted, Nurturing, Rejected',
        lead_score: 'integer (0-100, optional)',
        priority: 'enum: Low, Medium, High, Urgent',
        
        location: {
          city: 'string (optional, max 50 chars)',
          state: 'string (optional, max 50 chars)',
          country: 'string (optional, max 50 chars)'
        },
        
        tags: 'array of strings (optional, max 30 chars each)',
        notes: 'text (optional, max 2000 chars)',
        
        assigned_to: 'UUID (optional, FK to users table)',
        next_follow_up: 'timestamp (optional)',
        deal_stage: 'string (optional, max 100 chars)',
        account_id: 'UUID (optional, FK to accounts table)',
        
        custom_fields: 'JSON (optional)',
        source_campaign: 'string (optional, max 100 chars)',
        communication_channel: 'enum: Email, Phone, LinkedIn, Website, Referral, Event, Other',
        
        is_converted: 'boolean (optional, default false)',
        converted_at: 'timestamp (optional)',
        
        created_by: 'UUID (optional, FK to users table)',
        created_at: 'timestamp (auto-generated)',
        updated_at: 'timestamp (auto-updated)',
        deleted_at: 'timestamp (soft delete, optional)'
      }
    }
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Lead Management System API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
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