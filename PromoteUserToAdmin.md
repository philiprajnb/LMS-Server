# Promote Existing User to Admin

This project includes two safe ways to promote an existing user to `admin`:

1. API endpoint (admin-only): `POST /api/auth/admin/promote`
2. CLI bootstrap script: `npm run promote-admin -- --email <email> --key <BOOTSTRAP_ADMIN_KEY>`

## What Was Added

- API endpoint: `POST /api/auth/admin/promote`
- Route wiring: `routes/authRoutes.js`
- Controller logic: `controllers/authController.js`
- Validation schema: `utils/validation.js`
- Validation middleware mapping: `middleware/validation.js`
- CLI script: `scripts/promoteToAdmin.js`
- NPM script: `package.json` (`promote-admin`)
- Environment hint: `.env.example` (`BOOTSTRAP_ADMIN_KEY`)

## Security Controls

- Endpoint requires authenticated admin role: `auth + authorize('admin')`
- Request body is validated with Joi
  - `email` required
  - `reason` optional
- Optional hard guard:
  - If `BOOTSTRAP_ADMIN_KEY` is configured, request must include header `x-bootstrap-key` with matching value
- Inactive users cannot be promoted
- If user is already admin, operation is idempotent
- Promotion writes an audit event (best-effort)

## Usage

### 1) Set Bootstrap Key

In `.env`:

```env
BOOTSTRAP_ADMIN_KEY=your-long-random-secret
```

### 2) Promote via API

Endpoint:

```http
POST /api/auth/admin/promote
```

Headers:

```http
Authorization: Bearer <admin-jwt>
x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY>
```

`x-bootstrap-key` is required only when `BOOTSTRAP_ADMIN_KEY` is set on the server.

Body:

```json
{
  "email": "target-user@example.com",
  "reason": "Initial admin bootstrap"
}
```

### 3) Promote via Script

```bash
npm run promote-admin -- --email target-user@example.com --key your-long-random-secret
```

## API Responses

Success:

```json
{
  "success": true,
  "message": "User promoted to admin successfully",
  "data": {
    "user": {
      "_id": "...",
      "email": "target-user@example.com",
      "role": "admin"
    }
  }
}
```

Common errors:

- `400` Cannot promote inactive user
- `403` Invalid bootstrap key (if key check is enabled)
- `404` User not found
- `500` Internal server error

