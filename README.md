# Node.js Express MongoDB JWT Authentication API

🚀 A complete authentication API built with Node.js, Express, MongoDB, and JWT tokens.

## ✨ Features

- **User Authentication**: Register, login with JWT tokens
- **Secure Password Handling**: Bcrypt hashing with configurable salt rounds
- **Profile Management**: View and update user profiles
- **Password Management**: Secure password change functionality
- **Security**: Rate limiting, CORS, Helmet security headers
- **Validation**: Input validation with Mongoose and validator.js
- **Error Handling**: Comprehensive error handling with consistent responses

## 🏗️ Project Structure

```
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   ├── auth.js              # JWT middleware
│   └── errorHandler.js      # Error handling
├── models/
│   └── User.js              # User model
├── routes/
│   └── authRoutes.js        # Auth routes
├── utils/                   # Utilities
├── .env                     # Environment variables
├── server.js               # Main server file
└── API_DOCUMENTATION.md    # Complete API docs
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env` file and update `JWT_SECRET` and `MONGODB_URI`

3. **Start MongoDB:**
   - Make sure MongoDB is running locally or use MongoDB Atlas

4. **Run the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Test the API:**
   ```bash
   # Health check
   curl http://localhost:3000/api/health
   
   # Register a user
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
   ```

## 📚 API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)
- `GET /api/health` - Health check

## 📖 Documentation

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API documentation with examples.

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/nodejs-auth-db` |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (5 auth requests per 15 min)
- Security headers with Helmet
- Input validation and sanitization
- CORS configuration

## 📝 License

ISC License