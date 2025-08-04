# Node.js Express MongoDB JWT Authentication API

A complete authentication API built with Node.js, Express, MongoDB, and JWT tokens.

## Features

- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Input validation
- Rate limiting
- Security headers with Helmet
- Error handling
- User profile management
- Password change functionality

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nodejs-auth-db
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   BCRYPT_SALT_ROUNDS=12
   ```

4. Start the server:
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Health Check

#### GET /api/health
Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

---

## Authentication Endpoints

### 1. Register User

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "64f8a9b2c1234567890abcde",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

---

### 2. Login User

#### POST /api/auth/login

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64f8a9b2c1234567890abcde",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Get User Profile

#### GET /api/auth/profile

Get the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "64f8a9b2c1234567890abcde",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 4. Update User Profile

#### PUT /api/auth/profile

Update the current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "64f8a9b2c1234567890abcde",
      "name": "John Smith",
      "email": "johnsmith@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  }
}
```

---

### 5. Change Password

#### PUT /api/auth/change-password

Change the current user's password.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

---

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. After successful login or registration, you'll receive a token that must be included in the `Authorization` header for protected routes.

**Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

**Token Payload:**
```json
{
  "id": "64f8a9b2c1234567890abcde",
  "email": "john@example.com",
  "role": "user",
  "iat": 1640995200,
  "exp": 1641600000
}
```

---

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Validation error 1", "Validation error 2"] // Optional array for validation errors
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created (for registration)
- `400` - Bad Request (validation errors, missing fields)
- `401` - Unauthorized (invalid credentials, missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication routes** (`/login`, `/register`): 5 requests per 15 minutes per IP

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **Helmet**: Security headers for protection against common vulnerabilities
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive validation using Mongoose and validator.js
- **Error Handling**: Consistent error responses without sensitive information exposure

---

## Example Usage with cURL

### Register a new user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get profile (replace TOKEN with actual JWT):
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

### Update profile:
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "John Smith"
  }'
```

---

## Project Structure

```
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── errorHandler.js      # Global error handling
├── models/
│   └── User.js              # User model with Mongoose
├── routes/
│   └── authRoutes.js        # Authentication routes
├── utils/                   # Utility functions (future use)
├── .env                     # Environment variables
├── .gitignore              # Git ignore file
├── package.json            # Dependencies and scripts
├── server.js               # Main server file
└── API_DOCUMENTATION.md    # This documentation
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/nodejs-auth-db` |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `JWT_EXPIRES_IN` | JWT token expiration time | `7d` |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds for password hashing | `12` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.