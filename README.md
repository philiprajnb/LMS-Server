# Lead Management System API

A comprehensive REST API for managing leads in a CRM system, built with Node.js and Express.

## Features

- ✅ Complete CRUD operations for leads
- ✅ Advanced filtering, pagination, and sorting
- ✅ Input validation with Joi
- ✅ Email uniqueness enforcement
- ✅ Soft delete functionality
- ✅ Lead statistics and analytics
- ✅ Bulk operations (update/delete)
- ✅ Comprehensive error handling
- ✅ CORS and security middleware
- ✅ Request logging
- ✅ Health check endpoint

## Lead Schema

```json
{
  "id": "UUID",                              // Unique identifier
  "first_name": "string",                    // Required
  "last_name": "string",                     // Required
  "email": "string",                         // Required, unique
  "phone": "string",                         // Optional, formatted
  "company": "string",                       // Required
  "job_title": "string",                     // Optional
  "lead_source": "string",                   // Required
  "status": "enum",                          // New, Contacted, Qualified, Lost, Converted
  "lead_score": "integer",                   // Optional, 0-100
  "industry": "string",                      // Optional
  "location": {
    "city": "string",
    "state": "string",
    "country": "string"
  },
  "notes": "text",                           // Optional
  "assigned_to": "UUID",                     // Optional
  "next_follow_up": "timestamp",             // Optional
  "priority": "enum",                        // Low, Medium, High
  "tags": ["string"],                        // Optional array
  "deal_stage": "string",                    // Optional
  "account_id": "UUID",                      // Optional
  "custom_fields": "JSON",                   // Optional
  "source_campaign": "string",               // Optional
  "communication_channel": "string",         // Optional
  "is_converted": "boolean",                 // Optional
  "converted_at": "timestamp",               // Optional
  "created_by": "UUID",                      // Optional
  "created_at": "timestamp",                 // Auto-generated
  "updated_at": "timestamp",                 // Auto-updated
  "deleted_at": "timestamp | null"           // Soft delete
}
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

3. **The API will be available at:**
   - Server: `http://localhost:3000`
   - Documentation: `http://localhost:3000/api`
   - Health Check: `http://localhost:3000/health`

## API Endpoints

### Lead Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/leads` | Create a new lead |
| `GET` | `/api/leads` | Get all leads (with filtering/pagination) |
| `GET` | `/api/leads/:id` | Get a specific lead |
| `PUT` | `/api/leads/:id` | Update a specific lead |
| `DELETE` | `/api/leads/:id` | Soft delete a lead |
| `DELETE` | `/api/leads/:id/hard` | Permanently delete a lead |

### Analytics & Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leads/stats` | Get lead statistics |
| `POST` | `/api/leads/bulk/update` | Bulk update multiple leads |
| `POST` | `/api/leads/bulk/delete` | Bulk delete multiple leads |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api` | API documentation |

## Query Parameters

### GET /api/leads

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `assigned_to` (UUID): Filter by assigned user
- `company` (string): Filter by company name (partial match)
- `lead_source` (string): Filter by lead source
- `is_converted` (boolean): Filter by conversion status
- `search` (string): Search across multiple fields
- `sort_by` (string): Sort field (created_at, updated_at, first_name, last_name, company, lead_score)
- `sort_order` (string): Sort order (asc, desc)

### Example Queries

```bash
# Get all leads with pagination
GET /api/leads?page=1&limit=20

# Filter by status and priority
GET /api/leads?status=New&priority=High

# Search and sort
GET /api/leads?search=john&sort_by=created_at&sort_order=desc

# Complex filtering
GET /api/leads?company=tech&is_converted=false&lead_source=Website
```

## Example Requests

### Create a Lead

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-123-4567",
    "company": "Tech Solutions Inc",
    "job_title": "CTO",
    "lead_source": "Website",
    "status": "New",
    "lead_score": 85,
    "industry": "Technology",
    "location": {
      "city": "San Francisco",
      "state": "CA",
      "country": "USA"
    },
    "notes": "Interested in our enterprise solution",
    "priority": "High",
    "tags": ["enterprise", "hot-lead"],
    "deal_stage": "Discovery"
  }'
```

### Update a Lead

```bash
curl -X PUT http://localhost:3000/api/leads/{lead-id} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Qualified",
    "lead_score": 90,
    "notes": "Very interested, scheduled demo",
    "next_follow_up": "2024-02-15T10:00:00.000Z"
  }'
```

### Bulk Update

```bash
curl -X POST http://localhost:3000/api/leads/bulk/update \
  -H "Content-Type: application/json" \
  -d '{
    "lead_ids": ["lead-id-1", "lead-id-2"],
    "update_data": {
      "assigned_to": "user-id-123",
      "status": "Contacted"
    }
  }'
```

## Response Format

All API responses follow this consistent format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "pagination": { /* pagination info for list endpoints */ },
  "errors": [ /* validation errors if any */ ]
}
```

### Success Response Example

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "47852fcd-f2da-41ac-9621-6851f7fc87ea",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "company": "Tech Solutions Inc",
    "status": "New",
    "created_at": "2025-08-04T09:39:02.542Z",
    "updated_at": "2025-08-04T09:39:02.542Z"
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email",
      "value": "invalid-email"
    }
  ]
}
```

### Pagination Response Example

```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "data": [ /* array of leads */ ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total_items": 25,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

## Configuration

Create a `.env` file (copy from `.env.example`):

```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Testing

The repository includes a `examples/sample-requests.http` file with comprehensive API examples that you can use with REST clients like:
- VS Code REST Client extension
- Postman
- Insomnia
- curl commands

## Architecture

```
├── controllers/        # Request handlers
├── middleware/         # Custom middleware (validation, error handling)
├── models/            # Data models
├── routes/            # Route definitions
├── services/          # Business logic
├── utils/             # Utilities and validation schemas
├── examples/          # Sample API requests
└── server.js          # Main application file
```

## Data Storage

Currently uses in-memory storage for simplicity. In production, you would integrate with a database like:
- PostgreSQL
- MongoDB
- MySQL
- SQLite

## Security Features

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- Error message sanitization
- Request size limits

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Run tests (when implemented)
npm test

# Start production server
npm start
```

## Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Authentication and authorization
- [ ] Rate limiting
- [ ] Email notifications
- [ ] File uploads for lead documents
- [ ] Advanced analytics and reporting
- [ ] Lead scoring algorithms
- [ ] Integration with external CRM systems
- [ ] Webhook support
- [ ] API versioning

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License - see the LICENSE file for details.