# LMS Server API Contract (Validated)

Validated against current backend implementation in this repository.

## Global Conventions

- Base URL: /api
- Auth header format: Authorization: Bearer <token>
- JWT payload keys: id, email, role
- Common success envelope:
  - success: true
  - message: string
  - data: object or array (varies by endpoint)
- Common validation error envelope (Joi middleware):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "field_name",
      "message": "\"field_name\" is required",
      "value": null
    }
  ]
}
```

- Common auth errors:

```json
{
  "success": false,
  "message": "Access denied. No token provided or invalid format."
}
```

```json
{
  "success": false,
  "message": "Invalid token."
}
```

```json
{
  "success": false,
  "message": "Token expired."
}
```

- Common RBAC error:

```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

- Rate limits:
  - /api/*: 100 requests / 15 min
  - /api/auth/login and /api/auth/register: 5 requests / 15 min

## 1) Auth

### Endpoint
- Endpoint: /api/auth/register
- Method: POST
- Auth required: No

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

Success response (201):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "mongo_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-04-30T00:00:00.000Z",
      "createdAt": "2026-04-30T00:00:00.000Z",
      "updatedAt": "2026-04-30T00:00:00.000Z"
    },
    "token": "jwt_token"
  }
}
```

Validation or error responses:

```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "Please provide a valid email"
  ]
}
```

```json
{
  "success": false,
  "message": "Server error during registration"
}
```

### Endpoint
- Endpoint: /api/auth/login
- Method: POST
- Auth required: No

Request body:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Success response (200):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "mongo_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-04-30T00:00:00.000Z",
      "createdAt": "2026-04-30T00:00:00.000Z",
      "updatedAt": "2026-04-30T00:00:00.000Z"
    },
    "token": "jwt_token"
  }
}
```

Validation or error responses:

```json
{
  "success": false,
  "message": "Please provide email and password"
}
```

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

```json
{
  "success": false,
  "message": "Server error during login"
}
```

### Endpoint
- Endpoint: /api/auth/profile
- Method: GET
- Auth required: Yes (Bearer token)

Success response (200):

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "mongo_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-04-30T00:00:00.000Z",
      "createdAt": "2026-04-30T00:00:00.000Z",
      "updatedAt": "2026-04-30T00:00:00.000Z"
    }
  }
}
```

### Endpoint
- Endpoint: /api/auth/profile
- Method: PUT
- Auth required: Yes (Bearer token)

Request body:

```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

Success response (200):

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "mongo_id",
      "name": "John Updated",
      "email": "john.updated@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-04-30T00:00:00.000Z",
      "createdAt": "2026-04-30T00:00:00.000Z",
      "updatedAt": "2026-04-30T00:00:00.000Z"
    }
  }
}
```

Validation or error responses:

```json
{
  "success": false,
  "message": "Email is already taken"
}
```

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "Name cannot be more than 50 characters"
  ]
}
```

### Endpoint
- Endpoint: /api/auth/password
- Method: PUT
- Auth required: Yes (Bearer token)
- Alias route also exists: /api/auth/change-password

Request body:

```json
{
  "currentPassword": "oldSecret",
  "newPassword": "newSecret123"
}
```

Success response (200):

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

Validation or error responses:

```json
{
  "success": false,
  "message": "Please provide current password and new password"
}
```

```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

## 2) Dashboard

Use one summary endpoint.

### Endpoint
- Endpoint: /api/dashboard/summary
- Method: GET
- Auth required: Yes (Bearer token, roles: admin or manager)

Query params:
- from: ISO date-time (optional)
- to: ISO date-time (optional)
- owner_id: UUID (optional)
- region: string (optional, matches location.country)

Success response (200):

```json
{
  "success": true,
  "message": "Dashboard summary retrieved successfully",
  "data": {
    "kpis": {
      "total_leads": 0,
      "new_leads": 0,
      "assigned_leads": 0,
      "in_progress_leads": 0,
      "converted_leads": 0,
      "lost_or_rejected_leads": 0,
      "unassigned_leads": 0,
      "reassigned_leads": 0
    },
    "priority_distribution": [
      { "priority": "High", "count": 10 }
    ],
    "temperature_distribution": [
      { "bucket": "hot", "count": 2 },
      { "bucket": "warm", "count": 5 },
      { "bucket": "cold", "count": 8 }
    ],
    "source_breakdown": [
      { "source": "Website", "count": 12 }
    ],
    "channel_breakdown": [
      { "channel": "Email", "count": 7 }
    ],
    "recent_activity": [
      {
        "lead_id": "lead_uuid",
        "event": "lead_updated",
        "to_status": "Qualified",
        "at": "2026-04-30T00:00:00.000Z",
        "actor_id": null
      }
    ],
    "top_priority_queue": [
      {
        "id": "lead_uuid",
        "full_name": "Jane Smith",
        "priority": "Urgent",
        "lead_score": 92,
        "status": "Qualified",
        "assigned_to": "agent_uuid",
        "updated_at": "2026-04-30T00:00:00.000Z"
      }
    ]
  }
}
```

Business stage mapping currently used by backend logic:
- New: status = New
- In-progress: status in Contacted, Qualified, Nurturing
- Converted: is_converted = true
- Lost or rejected: status in Lost, Rejected

## 3) Leads

Note: Leads routes are currently public (no auth middleware on these routes).

### Endpoint
- Endpoint: /api/leads
- Method: GET
- Auth required: No

Query params:
- page, limit
- status
- priority
- assigned_to
- company_name
- lead_source
- industry
- role_in_decision
- is_converted
- search
- sort_by (created_at, updated_at, first_name, last_name, company_name, lead_score, priority, status)
- sort_order (asc, desc)

Success response (200):

```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "data": [
    {
      "id": "lead_uuid",
      "_id": "mongo_id",
      "first_name": "Jane",
      "last_name": "Smith",
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+11234567890",
      "lead_source": "Website",
      "priority": "High",
      "assigned_to": "agent_uuid",
      "status": "New",
      "created_at": "2026-04-30T00:00:00.000Z",
      "updated_at": "2026-04-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total_items": 1,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

### Endpoint
- Endpoint: /api/leads/:id
- Method: GET
- Auth required: No

Success response (200):

```json
{
  "success": true,
  "message": "Lead retrieved successfully",
  "data": {
    "id": "lead_uuid"
  }
}
```

Not found (404):

```json
{
  "success": false,
  "message": "Lead not found"
}
```

### Endpoint
- Endpoint: /api/leads
- Method: POST
- Auth required: No

Required request fields:
- first_name
- last_name
- email
- company_name
- lead_source

Success response (201):

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "lead_uuid"
  }
}
```

Duplicate email error:

```json
{
  "success": false,
  "message": "Conflict",
  "errors": [
    {
      "field": "email",
      "message": "A lead with this email already exists"
    }
  ]
}
```

### Endpoint
- Endpoint: /api/leads/:id
- Method: PUT
- Auth required: No

Request body:
- Any updatable lead field listed in canonical schema below

Success response (200):

```json
{
  "success": true,
  "message": "Lead updated successfully",
  "data": {
    "id": "lead_uuid"
  }
}
```

Search or filter or sort extras available:
- GET /api/leads/stats
- GET /api/leads/classification/:type
- GET /api/leads/classification/:type/stats

Canonical lead object schema:
- id: UUID business ID (used in API params)
- _id: MongoDB ID
- full_name: virtual derived from first_name and last_name
- email
- phone
- lead_source
- priority
- assigned_to
- status
- created_at
- updated_at
- No processData object exists

Flat versus nested payload guidance:
- Send flat lead fields
- Nested objects supported:
  - location
  - custom_fields

Valid workflow status values:
- New
- Contacted
- Qualified
- Lost
- Converted
- Nurturing
- Rejected

Valid priority values:
- Low
- Medium
- High
- Urgent

Valid source values:
- lead_source is free-text string (no enum restriction)

## 4) Agents

### Endpoint
- Endpoint: /api/agents
- Method: GET
- Auth required: Yes (Bearer token, roles: admin or manager)

Query params:
- region
- availability (available, busy, offline)
- is_locked (boolean)
- is_active (boolean)

Success response (200):

```json
{
  "success": true,
  "message": "Agents retrieved successfully",
  "data": [
    {
      "id": "agent_uuid",
      "name": "Agent A",
      "email": "agent@example.com",
      "phone": "+11234567890",
      "region": "Global",
      "max_capacity": 50,
      "availability": "available",
      "is_locked": false,
      "is_active": true,
      "created_at": "2026-04-30T00:00:00.000Z",
      "updated_at": "2026-04-30T00:00:00.000Z",
      "active_lead_count": 12
    }
  ]
}
```

### Endpoint
- Endpoint: /api/agents/:id
- Method: GET
- Auth required: Yes (Bearer token, roles: admin or manager)

Success response (200):

```json
{
  "success": true,
  "message": "Agent retrieved successfully",
  "data": {
    "id": "agent_uuid",
    "name": "Agent A",
    "email": "agent@example.com",
    "phone": "+11234567890",
    "region": "Global",
    "max_capacity": 50,
    "availability": "available",
    "is_locked": false,
    "is_active": true,
    "active_lead_count": 12
  }
}
```

### Endpoint
- Endpoint: /api/agents
- Method: POST
- Auth required: Yes (Bearer token, role: admin)

Request body:

```json
{
  "name": "Agent A",
  "email": "agent@example.com",
  "phone": "+11234567890",
  "region": "Global",
  "max_capacity": 50,
  "availability": "available",
  "is_locked": false,
  "is_active": true
}
```

Success response (201):

```json
{
  "success": true,
  "message": "Agent created successfully",
  "data": {
    "id": "agent_uuid"
  }
}
```

### Endpoint
- Endpoint: /api/agents/:id
- Method: PUT
- Auth required: Yes (Bearer token, role: admin)

Request body:
- Any subset of create fields

Success response (200):

```json
{
  "success": true,
  "message": "Agent updated successfully",
  "data": {
    "id": "agent_uuid"
  }
}
```

### Endpoint
- Endpoint: /api/agents/:id/assign
- Method: POST
- Auth required: Yes (Bearer token, roles: admin or manager)

Request body:

```json
{
  "lead_ids": ["lead_uuid_1", "lead_uuid_2"],
  "reason": "workload balancing"
}
```

Success response (200):

```json
{
  "success": true,
  "message": "Lead assignment completed",
  "data": {
    "agent_id": "agent_uuid",
    "assigned": 2,
    "skipped": 0,
    "missing_lead_ids": []
  }
}
```

### Endpoint
- Endpoint: /api/agents/:id/reassign
- Method: POST
- Auth required: Yes (Bearer token, roles: admin or manager)

Request body:

```json
{
  "lead_ids": ["lead_uuid_1", "lead_uuid_2"],
  "from_agent_id": "old_agent_uuid",
  "reason": "coverage change"
}
```

Success response (200):

```json
{
  "success": true,
  "message": "Lead reassignment completed",
  "data": {
    "to_agent_id": "agent_uuid",
    "from_agent_id": "old_agent_uuid",
    "reassigned": 2,
    "skipped": 0,
    "missing_lead_ids": []
  }
}
```

### Endpoint
- Endpoint: /api/agents/:id/capacity
- Method: GET
- Auth required: Yes (Bearer token, roles: admin or manager)

Success response (200):

```json
{
  "success": true,
  "message": "Agent capacity retrieved successfully",
  "data": {
    "agent_id": "agent_uuid",
    "max_capacity": 50,
    "active_lead_count": 12,
    "remaining_capacity": 38,
    "is_over_capacity": false
  }
}
```

## 5) Reports

All report endpoints require auth and role admin or manager.

### Endpoint
- Endpoint: /api/reports/conversion-metrics
- Method: GET
- Auth required: Yes (Bearer, admin or manager)

Query params:
- from, to, owner_id, region

Success response:

```json
{
  "success": true,
  "message": "Conversion metrics retrieved successfully",
  "data": {
    "from": "2026-04-01T00:00:00.000Z",
    "to": "2026-04-30T23:59:59.999Z",
    "total_leads": 100,
    "converted_leads": 12,
    "lost_leads": 20,
    "rejected_leads": 8,
    "conversion_rate": 0.12
  }
}
```

### Endpoint
- Endpoint: /api/reports/leads-by-source
- Method: GET
- Auth required: Yes (Bearer, admin or manager)

Query params:
- from, to, owner_id, region

Success response:

```json
{
  "success": true,
  "message": "Leads by source retrieved successfully",
  "data": {
    "from": null,
    "to": null,
    "rows": [
      { "source": "Website", "count": 20 }
    ]
  }
}
```

### Endpoint
- Endpoint: /api/reports/leads-by-stage
- Method: GET
- Auth required: Yes (Bearer, admin or manager)

Query params:
- from, to, owner_id, region

Success response:

```json
{
  "success": true,
  "message": "Leads by stage retrieved successfully",
  "data": {
    "from": null,
    "to": null,
    "rows": [
      { "stage": "New", "count": 25 }
    ]
  }
}
```

### Endpoint
- Endpoint: /api/reports/leads-by-region
- Method: GET
- Auth required: Yes (Bearer, admin or manager)

Query params:
- from, to, owner_id, region

Success response:

```json
{
  "success": true,
  "message": "Leads by region retrieved successfully",
  "data": {
    "from": null,
    "to": null,
    "rows": [
      { "country": "India", "state": "Tamil Nadu", "count": 7 }
    ]
  }
}
```

### Endpoint
- Endpoint: /api/reports/agent-performance
- Method: GET
- Auth required: Yes (Bearer, admin or manager)

Query params:
- from, to, owner_id, region, agent_id

Success response:

```json
{
  "success": true,
  "message": "Agent performance retrieved successfully",
  "data": {
    "from": null,
    "to": null,
    "rows": [
      {
        "agent_id": "agent_uuid",
        "total_leads": 30,
        "converted_leads": 5,
        "in_progress_leads": 9,
        "conversion_rate": 0.1667
      }
    ]
  }
}
```

## 6) Audit Log

### Endpoint
- Endpoint: /api/audit-logs
- Method: GET
- Auth required: Yes (Bearer token, roles: admin or manager)

Filters supported:
- actor_id
- entity_type
- entity_id
- action
- from
- to
- page
- limit

Success response (200):

```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": [
    {
      "id": "audit_uuid",
      "actor_id": "user_uuid",
      "actor_role": "admin",
      "action": "reassign",
      "entity_type": "lead",
      "entity_id": "lead_uuid",
      "changes": {
        "assigned_to": {
          "from": "old_agent_uuid",
          "to": "new_agent_uuid"
        }
      },
      "reason": "coverage change",
      "metadata": {
        "ip": "::1",
        "user_agent": "Mozilla/5.0"
      },
      "created_at": "2026-04-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 1,
    "total_pages": 1,
    "has_next_page": false,
    "has_prev_page": false
  }
}
```

## 7) Business Rules (Confirmed from Implementation)

- Workflow lifecycle is not strictly enforced by transition rules. Any valid status can be set directly.
- Active lead is treated as assigned lead with status in New, Contacted, Qualified, Nurturing (used in agent capacity and active lead count logic).
- Converted lead is counted using is_converted = true (not only status = Converted).
- Reassignment rules:
  - Requires admin or manager access on reassignment endpoint.
  - from_agent_id is optional filter, not mandatory.
  - Audit log written for reassign actions.
- Ownership rules:
  - assigned_to is the current owner field.
  - Single owner only.
- Capacity rules:
  - Capacity is measured via max_capacity and active_lead_count.
  - Assignment is not currently blocked when exceeding max_capacity.
- Deleted or archived leads:
  - Standard find operations exclude soft-deleted leads due to model query middleware.
  - Dashboard and reports explicitly filter deleted_at missing.
- Duplicate prevention:
  - Lead email unique.
  - User email unique.
  - Agent email unique.
- RBAC:
  - User roles: user, admin, manager, agent.
  - Dashboard or reports or audit: admin, manager.
  - Agent create or update: admin.
  - Agent list/get/capacity/assign/reassign: admin, manager.
  - Auth profile and password: any authenticated user.
  - Leads CRUD currently does not require auth.

## Frontend Wiring Decision (Final)

You do not need to wait for additional backend clarifications for the listed modules.

You can wire immediately using:
- One dashboard summary endpoint: /api/dashboard/summary
- Direct leads CRUD: /api/leads and /api/leads/:id
- Agent and assignment flows: /api/agents endpoints
- Reports: /api/reports endpoints
- Audit trail list: /api/audit-logs

Only optional product-level decisions remaining (not API contract blockers):
- Should lead assignment enforce capacity hard-limit
- Should workflow transitions be constrained by strict stage rules
