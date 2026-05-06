# Lead Management System by PRNB

Backend API for a lead management platform built with Node.js, Express, MongoDB, and JWT-based authentication. The service covers lead lifecycle management, agent assignment, queue-based routing, dashboard metrics, reporting, audit logging, and role-based admin operations.

## Overview

This server exposes a REST API for teams that need to capture leads, score and classify them, route them to agents, and monitor operational performance. It includes authentication, role-aware access control, assignment rules, queue ownership, and reporting endpoints behind a single Express application.

## Core Capabilities

- JWT authentication with profile and password management
- Lead CRUD, bulk actions, scoring, recommendations, and classification endpoints
- Agent management with capacity tracking, assignment, and reassignment flows
- Assignment rules and queue-based routing for automated lead distribution
- Dashboard summaries, report endpoints, and audit log access
- Security middleware with Helmet, CORS, request logging, and rate limiting

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT and bcryptjs for auth
- Joi for request validation

## Project Structure

```text
config/         Database configuration
controllers/    Route handlers and business orchestration
middleware/     Auth, validation, and error handling middleware
models/         Mongoose schemas
routes/         API route definitions
scripts/        Operational scripts
services/       Lead scoring and assignment logic
utils/          Shared validation helpers
server.js       Express bootstrap and route registration
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file and provide the values your environment needs.

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/lms-server
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
BOOTSTRAP_ADMIN_KEY=replace-with-a-random-secret
```

### 3. Run the server

```bash
npm run dev
```

For production:

```bash
npm start
```

### 4. Verify the service

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api
```

## Available Scripts

- `npm start` starts the API with Node.js
- `npm run dev` starts the API with nodemon
- `npm test` runs the Jest test suite
- `npm run promote-admin -- --email user@example.com --key <BOOTSTRAP_ADMIN_KEY>` promotes an existing user to admin
- `npm run backfill-owner-type` runs the owner type backfill script

## API Surface

Primary route groups:

- `/api/auth` for authentication, profile management, and admin promotion
- `/api/leads` for lead management, bulk actions, scoring, and classification
- `/api/agents` for agent operations and capacity-aware assignment
- `/api/assignment-rules` for routing rules
- `/api/queues` for lead queue workflows
- `/api/dashboard` for summary metrics
- `/api/reports` for reporting endpoints
- `/api/audit-logs` for audit history

The root API index is available at `/api`, and the health check is available at `/health`.

## Security and Operations

- Helmet sets common security headers
- CORS is restricted through `ALLOWED_ORIGINS`, with relaxed behavior in development
- General and auth-specific rate limits are configurable via environment variables
- Request payloads are limited to 10 MB
- Centralized not-found and error handlers provide consistent API responses

## Documentation

Detailed endpoint documentation lives in `API_DOCUMENTATION.md`.

## License

MIT
