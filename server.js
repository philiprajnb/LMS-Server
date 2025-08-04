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
});

module.exports = app;