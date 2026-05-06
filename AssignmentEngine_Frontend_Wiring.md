# Assignment Engine — Frontend Wiring Guide

This document covers everything added in the Salesforce-style assignment engine sprint.
Read this alongside `Frontend_API_Contract_Validated.md` for the full picture.

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Auth & RBAC Quick Reference](#2-auth--rbac-quick-reference)
3. [Assignment Rules API](#3-assignment-rules-api)
4. [Lead Queues API](#4-lead-queues-api)
5. [Lead Auto-Assign Endpoints](#5-lead-auto-assign-endpoints)
6. [Updated Lead Schema Fields](#6-updated-lead-schema-fields)
7. [Updated Dashboard KPIs](#7-updated-dashboard-kpis)
8. [Agent Schema Additions](#8-agent-schema-additions)
9. [Audit Log Additions](#9-audit-log-additions)
10. [End-to-End UI Flow Examples](#10-end-to-end-ui-flow-examples)
11. [Error Reference](#11-error-reference)

---

## 1. What Was Built

| Feature | Description |
|---|---|
| **Assignment Rules** | Admin/Manager-defined routing rules with priority ordering, field-based criteria, and multiple assignment methods |
| **Lead Queues** | Named agent pools; leads are parked here when no direct agent is matched |
| **Auto-Assign** | One-click or bulk engine trigger on any lead |
| **Suggested Agents** | Ranked list of compatible agents for a lead (for manual picker UI) |
| **Dashboard KPIs** | New counters: queue_owned, agent_owned, truly_unassigned, sla_breached, active_queues |

### Assignment Methods

| Method | Behaviour |
|---|---|
| `direct` | Assigns to one specific agent (`target_agent_id`) |
| `round_robin` | Cycles through `target_agents[]` by index |
| `queue` | Parks lead in `target_queue_id`; agents claim from queue |

### Engine Policy (important for UI copy)

- Rules are evaluated in **ascending priority order** (1 = highest).
- First rule where **all criteria match** wins (AND logic).
- If the target agent is at **full capacity**, that rule is skipped and the next rule is tried.
- If **no rule matches**, the lead is placed in the **default queue** (fallback).
- Queue leads stay queue-owned until an agent explicitly **claims** them.

---

## 2. Auth & RBAC Quick Reference

All endpoints require `Authorization: Bearer <token>`.

| Role | Assignment Rules | Queues | Auto-Assign | Suggested Agents |
|---|---|---|---|---|
| `admin` | Full CRUD + activate/deactivate/reorder | Full CRUD + dispatch | ✅ | ✅ |
| `manager` | Full CRUD + activate/deactivate/reorder | Full CRUD + dispatch | ✅ | ✅ |
| `agent` | Read-only (list + get) | Read + claim only | ❌ | ❌ |
| `user` | ❌ | ❌ | ❌ | ❌ |

---

## 3. Assignment Rules API

Base path: `/api/assignment-rules`

---

### 3.1 List Rules

```
GET /api/assignment-rules
```

**Roles:** admin, manager, agent (read)

**Query params (all optional):**

| Param | Type | Description |
|---|---|---|
| `is_active` | boolean | Filter by active state |
| `assignment_method` | string | `direct` \| `round_robin` \| `queue` |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response 200:**
```json
{
  "rules": [
    {
      "id": "uuid",
      "name": "Enterprise Leads → Alice",
      "description": "Route company size > 500 to senior rep",
      "priority": 1,
      "is_active": true,
      "assignment_method": "direct",
      "target_agent_id": "agent-uuid",
      "target_agents": [],
      "target_queue_id": null,
      "criteria": [
        { "field": "company_size", "operator": "gte", "value": 500 },
        { "field": "source", "operator": "eq", "value": "enterprise_inbound" }
      ],
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### 3.2 Get Single Rule

```
GET /api/assignment-rules/:id
```

**Roles:** admin, manager, agent

**Response 200:** Same shape as one item in the list above.

---

### 3.3 Create Rule

```
POST /api/assignment-rules
```

**Roles:** admin, manager

**Request body:**
```json
{
  "name": "High-Score Leads → Round Robin",
  "description": "Hot leads shared across 3 senior reps",
  "priority": 2,
  "is_active": true,
  "assignment_method": "round_robin",
  "target_agents": ["agent-uuid-1", "agent-uuid-2", "agent-uuid-3"],
  "criteria": [
    { "field": "lead_score", "operator": "gte", "value": 70 },
    { "field": "industry", "operator": "in", "value": ["SaaS", "Fintech"] }
  ]
}
```

**Criteria field options:**

| `field` | Supported operators |
|---|---|
| `lead_score` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` |
| `source` | `eq`, `neq`, `in`, `nin` |
| `industry` | `eq`, `neq`, `in`, `nin` |
| `stage` | `eq`, `neq`, `in`, `nin` |
| `company_size` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` |
| `territory` | `eq`, `neq`, `in`, `nin` |
| `lead_classification` | `eq`, `neq`, `in`, `nin` (`hot`/`warm`/`cold`) |

For `assignment_method`:
- `direct` → provide `target_agent_id` (string)
- `round_robin` → provide `target_agents` (array of agent UUIDs, min 1)
- `queue` → provide `target_queue_id` (string)

**Response 201:**
```json
{ "rule": { ...full rule object... } }
```

---

### 3.4 Update Rule

```
PUT /api/assignment-rules/:id
```

**Roles:** admin, manager

**Request body:** Same fields as create (all optional — send only what changes).

**Response 200:**
```json
{ "rule": { ...updated rule object... } }
```

---

### 3.5 Delete Rule

```
DELETE /api/assignment-rules/:id
```

**Roles:** admin, manager

**Response 200:**
```json
{ "message": "Assignment rule deleted" }
```

---

### 3.6 Activate / Deactivate Rule

```
POST /api/assignment-rules/:id/activate
POST /api/assignment-rules/:id/deactivate
```

**Roles:** admin, manager

**No request body needed.**

**Response 200:**
```json
{ "rule": { ...rule with updated is_active... } }
```

---

### 3.7 Reorder Rule Priority

```
PUT /api/assignment-rules/:id/priority
```

**Roles:** admin, manager

**Request body:**
```json
{ "priority": 3 }
```

**Response 200:**
```json
{ "rule": { ...rule with new priority... } }
```

> **UI Tip:** Implement a drag-and-drop list. On drop, call this endpoint with the new priority number. The engine evaluates rules in ascending `priority` order at query time — no DB resequencing needed.

---

## 4. Lead Queues API

Base path: `/api/queues`

---

### 4.1 List Queues

```
GET /api/queues
```

**Roles:** admin, manager, agent

**Response 200:**
```json
{
  "queues": [
    {
      "id": "uuid",
      "name": "Default Queue",
      "description": "Fallback for unmatched leads",
      "is_default": true,
      "routing_strategy": "round_robin",
      "sla_hours": 24,
      "current_size": 14,
      "total_processed": 203,
      "members": ["agent-uuid-1", "agent-uuid-2"],
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 3
}
```

---

### 4.2 Create Queue

```
POST /api/queues
```

**Roles:** admin, manager

**Request body:**
```json
{
  "name": "Enterprise Queue",
  "description": "High-value accounts waiting for senior reps",
  "routing_strategy": "round_robin",
  "sla_hours": 12,
  "members": ["agent-uuid-1", "agent-uuid-2"],
  "is_default": false
}
```

| Field | Required | Values |
|---|---|---|
| `name` | ✅ | string |
| `routing_strategy` | optional | `round_robin` (default) \| `manual` |
| `sla_hours` | optional | number (default 24) |
| `members` | optional | array of agent UUIDs |
| `is_default` | optional | boolean — only one queue may be default |

**Response 201:**
```json
{ "queue": { ...full queue object... } }
```

---

### 4.3 Get / Update / Delete Queue

```
GET    /api/queues/:id
PUT    /api/queues/:id
DELETE /api/queues/:id
```

**Roles:** admin, manager  
**PUT body:** Same optional fields as create.  
**Response:** `{ "queue": {...} }` or `{ "message": "Queue deleted" }`

> You cannot delete the default queue while it has members or assigned leads.

---

### 4.4 Get Leads in Queue

```
GET /api/queues/:id/leads
```

**Roles:** admin, manager, agent

**Query params (optional):**

| Param | Description |
|---|---|
| `page` | Default 1 |
| `limit` | Default 20 |
| `sort` | `sla_due_at` \| `lead_score` \| `created_at` (default) |

**Response 200:**
```json
{
  "leads": [ ...lead objects with full schema... ],
  "total": 14,
  "page": 1,
  "limit": 20
}
```

---

### 4.5 Claim a Lead from Queue

```
POST /api/queues/:id/claim
```

**Roles:** admin, manager, agent

**Request body:**
```json
{ "lead_id": "lead-uuid" }
```

**What happens server-side:**
1. Validates the lead belongs to this queue.
2. Checks the claiming agent is not over capacity.
3. Moves lead from `owner_type: "queue"` → `owner_type: "agent"`.
4. Sets `claimed_by` and `claimed_at`.
5. Writes an audit log entry.

**Response 200:**
```json
{
  "message": "Lead claimed successfully",
  "lead": { ...updated lead... }
}
```

**Response 409** (capacity full):
```json
{ "error": "Agent is at full capacity" }
```

---

### 4.6 Dispatch Leads from Queue

```
POST /api/queues/:id/dispatch
```

**Roles:** admin, manager

Runs the assignment engine on all unassigned leads in this queue, routing them to available agents via round-robin.

**No request body needed.**

**Response 200:**
```json
{
  "dispatched": 8,
  "failed": 2,
  "results": [
    { "lead_id": "uuid", "status": "assigned", "agent_id": "uuid" },
    { "lead_id": "uuid", "status": "failed", "reason": "no_available_agents" }
  ]
}
```

---

## 5. Lead Auto-Assign Endpoints

### 5.1 Auto-Assign Single Lead

```
POST /api/leads/:id/auto-assign
```

**Roles:** admin, manager

Triggers the assignment engine for one lead. The engine evaluates all active rules in priority order and either assigns the lead to an agent or parks it in the default queue.

**No request body needed.**

**Response 200:**
```json
{
  "message": "Lead assigned to agent",
  "lead": {
    "id": "lead-uuid",
    "owner_type": "agent",
    "assigned_to": "agent-uuid",
    "assignment_rule_id": "rule-uuid",
    "sla_due_at": "2026-01-02T10:00:00.000Z",
    "assignment_history": [ ...see section 6... ]
  },
  "method": "direct",
  "rule_name": "Enterprise Leads → Alice"
}
```

**Response 200 (fallback to queue):**
```json
{
  "message": "No matching rule; lead placed in default queue",
  "lead": {
    "owner_type": "queue",
    "assignment_queue_id": "queue-uuid",
    ...
  },
  "method": "fallback_queue"
}
```

---

### 5.2 Bulk Auto-Assign

```
POST /api/leads/bulk/auto-assign
```

**Roles:** admin, manager

**Request body (optional — omit to process ALL unassigned leads):**
```json
{
  "lead_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response 200:**
```json
{
  "processed": 45,
  "assigned_to_agent": 38,
  "assigned_to_queue": 7,
  "errors": []
}
```

---

### 5.3 Get Suggested Agents for a Lead

```
GET /api/leads/:id/suggested-agents
```

**Roles:** admin, manager

Returns a ranked list of agents compatible with this lead. Use this to power a **"Manually Assign" modal** — show the list and let the user pick.

**Response 200:**
```json
{
  "suggestions": [
    {
      "agent_id": "uuid",
      "name": "Alice Chen",
      "email": "alice@company.com",
      "score": 92,
      "reasons": ["industry_match", "territory_match", "available_capacity"],
      "current_leads": 4,
      "max_capacity": 10,
      "availability": "available"
    },
    {
      "agent_id": "uuid",
      "name": "Bob Watts",
      "score": 71,
      "reasons": ["territory_match"],
      "current_leads": 8,
      "max_capacity": 10,
      "availability": "available"
    }
  ]
}
```

After the user selects, call the existing manual-assign endpoint:
```
POST /api/leads/:id/assign
Body: { "agent_id": "selected-agent-uuid" }
```

---

## 6. Updated Lead Schema Fields

These fields now appear in every lead object returned by the API.

```json
{
  "id": "uuid",
  "name": "...",

  // --- Assignment engine fields ---
  "owner_type": "agent | queue | unassigned",
  "assigned_to": "agent-uuid or null",
  "assignment_rule_id": "rule-uuid or null",
  "assignment_queue_id": "queue-uuid or null",
  "sla_due_at": "ISO timestamp or null",
  "claimed_by": "agent-uuid or null",
  "claimed_at": "ISO timestamp or null",

  // --- History (array, newest last) ---
  "assignment_history": [
    {
      "assigned_to": "agent-uuid",
      "owner_type": "agent",
      "assigned_at": "ISO timestamp",
      "rule_id": "rule-uuid",
      "method": "direct | round_robin | queue | manual | fallback_queue",
      "reason": "human readable"
    }
  ],

  // --- Existing fields ---
  "lead_score": 85,
  "lead_classification": "hot | warm | cold | disqualified",
  "stage": "new | contacted | qualified | proposal | negotiation | closed_won | closed_lost",
  ...
}
```

### owner_type display mapping

| `owner_type` | UI display |
|---|---|
| `agent` | Show agent name from `assigned_to` |
| `queue` | Show queue name from `assignment_queue_id` |
| `unassigned` | Show "Unassigned" badge |

---

## 7. Updated Dashboard KPIs

```
GET /api/dashboard/summary
```

The response now includes an extended `leads` block and a new `active_queues` block.

```json
{
  "leads": {
    "total": 320,
    "new_this_week": 42,
    "by_stage": { ... },
    "by_classification": { "hot": 30, "warm": 90, "cold": 180, "disqualified": 20 },

    // --- New fields ---
    "agent_owned": 210,
    "queue_owned": 55,
    "truly_unassigned": 55,
    "sla_breached": 8,
    "reassigned_leads": 14
  },

  "active_queues": [
    {
      "id": "queue-uuid",
      "name": "Default Queue",
      "current_size": 14,
      "sla_hours": 24,
      "sla_breached_count": 3
    },
    {
      "id": "queue-uuid",
      "name": "Enterprise Queue",
      "current_size": 6,
      "sla_hours": 12,
      "sla_breached_count": 1
    }
  ],

  "agents": { ... },
  "conversion_rate": "...",
  "recent_activity": [ ... ]
}
```

### Suggested dashboard widgets

| KPI | Widget |
|---|---|
| `agent_owned` | Stat card — "Agent-owned leads" |
| `queue_owned` | Stat card — "In queue" |
| `truly_unassigned` | Alert badge if > 0 |
| `sla_breached` | Red alert card — "SLA breached" |
| `active_queues[]` | Queue health table |

---

## 8. Agent Schema Additions

These fields now exist on all agent objects:

```json
{
  "id": "uuid",
  "name": "Alice Chen",
  "email": "alice@company.com",
  "availability": "available | busy | offline",
  "max_capacity": 10,
  "current_leads": 4,
  "is_active": true,

  // --- New specialization fields ---
  "specialization": ["SaaS", "Fintech"],
  "preferred_sources": ["website", "enterprise_inbound"],
  "territory_ids": ["region-northeast", "region-midwest"],
  "round_robin_index": 2
}
```

`round_robin_index` is internal — no need to display it. The others can be shown in an agent profile/edit form.

---

## 9. Audit Log Additions

```
GET /api/audit-logs
```

Assignment-related events now include a `metadata` block:

```json
{
  "id": "uuid",
  "actor_id": "user-uuid",
  "actor_role": "admin",
  "action": "lead_assigned | lead_claimed | lead_reassigned | rule_matched | fallback_queue",
  "entity_type": "lead",
  "entity_id": "lead-uuid",
  "reason": "Matched rule: Enterprise Leads → Alice",
  "metadata": {
    "rule_id": "rule-uuid",
    "rule_name": "Enterprise Leads → Alice",
    "queue_id": null,
    "assignment_method": "direct",
    "fallback_reason": null
  },
  "created_at": "..."
}
```

For fallback events, `fallback_reason` will contain a human-readable explanation (e.g., `"no_matching_rule"` or `"all_agents_at_capacity"`).

---

## 10. End-to-End UI Flow Examples

### Flow A — Admin configures a routing rule

1. Admin opens **Settings → Assignment Rules**
2. `GET /api/assignment-rules` → render sortable rule list by `priority`
3. Admin clicks **New Rule** → form with fields: name, priority, method, criteria, target
4. On save → `POST /api/assignment-rules`
5. Toggle active/inactive → `POST /api/assignment-rules/:id/activate` or `/deactivate`
6. Drag to reorder → `PUT /api/assignment-rules/:id/priority`

---

### Flow B — Bulk assign unassigned leads

1. Manager opens **Leads** page, filters `owner_type=unassigned`
2. Clicks **Auto-Assign All**
3. `POST /api/leads/bulk/auto-assign` (no body = process all unassigned)
4. Show progress with result counts: `assigned_to_agent`, `assigned_to_queue`
5. Refresh leads list

---

### Flow C — Agent claims a lead from queue

1. Agent opens **Queue** tab
2. `GET /api/queues` → pick their queue
3. `GET /api/queues/:id/leads?sort=sla_due_at` → show leads sorted by SLA urgency
4. Agent clicks **Claim** on a lead
5. `POST /api/queues/:id/claim` with `{ "lead_id": "..." }`
6. Lead moves to agent's personal pipeline

---

### Flow D — Manager manually assigns with suggestions

1. Manager opens a lead detail page
2. Clicks **Assign Manually**
3. `GET /api/leads/:id/suggested-agents` → render ranked agent list
4. Manager selects an agent
5. `POST /api/leads/:id/assign` with `{ "agent_id": "..." }`

---

### Flow E — Dashboard SLA monitoring

1. Load dashboard: `GET /api/dashboard/summary`
2. If `leads.sla_breached > 0` → show red banner with count
3. Render `active_queues[]` table with `sla_breached_count` per queue
4. Link queue rows to `GET /api/queues/:id/leads?sort=sla_due_at` for drill-down

---

## 11. Error Reference

| HTTP | `error` value | When |
|---|---|---|
| 400 | `"Validation error"` | Missing/invalid request body |
| 400 | `"lead_ids must be an array"` | Wrong type in bulk assign |
| 403 | `"Insufficient permissions"` | Role not allowed for this endpoint |
| 404 | `"Assignment rule not found"` | Invalid rule ID |
| 404 | `"Queue not found"` | Invalid queue ID |
| 404 | `"Lead not found"` | Invalid lead ID |
| 409 | `"Agent is at full capacity"` | Claim rejected — agent maxed out |
| 409 | `"A default queue already exists"` | Attempt to create second default queue |
| 422 | `"No default queue configured"` | Auto-assign fallback has nowhere to go — create a default queue first |

---

*Generated: 2026-05-01 | LMS-Server Assignment Engine Sprint*
