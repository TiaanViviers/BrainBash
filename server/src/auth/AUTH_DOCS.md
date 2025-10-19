# Authentication System Documentation

## Overview

The authentication system provides secure user registration, login, and token-based authentication using JWT (JSON Web Tokens) and bcrypt password hashing. The system implements industry-standard security practices including HTTP-only cookies for refresh tokens, role-based access control, and secure password requirements.

### Security Features

- **Password Hashing**: bcrypt with 12 salt rounds (exceeds project specification requirement of ≥12)
- **JWT Tokens**: Dual-token system (access + refresh) for secure authentication
- **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days
- **HTTP-Only Cookies**: Refresh tokens stored in HTTP-only cookies (not accessible via JavaScript)
- **Password Validation**: Enforced strength requirements (8+ chars, uppercase, lowercase, number)
- **Role-Based Access Control**: Support for PLAYER and ADMIN roles
- **Email Validation**: RFC-compliant email format validation
- **Username Validation**: Alphanumeric + underscore only, minimum 3 characters

---

## Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ HTTP Requests
       │ (Authorization: Bearer <token>)
       ↓
┌──────────────────┐
│  Auth Routes     │  ← /api/auth/*
│  (routes.js)     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Auth Controller │  ← HTTP handlers
│  (controller.js) │     Input validation
└────────┬─────────┘     Response formatting
         ↓
┌──────────────────┐
│  Auth Service    │  ← Business logic
│  (service.js)    │     Password hashing
└────────┬─────────┘     JWT generation
         ↓                Database queries
┌──────────────────┐
│  Prisma ORM      │  ← Database access
│  (PostgreSQL)    │
└──────────────────┘

Middleware:
┌──────────────────┐
│  Auth Middleware │  ← Token verification
│  (middleware.js) │     Role enforcement
└──────────────────┘     Optional auth
```

---

## API Endpoints

### 1. Register New User

**Endpoint:** `POST /api/auth/register`  
**Authentication:** Not required  
**Description:** Create a new user account with username, email, password, and optional avatar.

#### Request Body

```json
{
  "username": "string",    // Required: 3+ chars, alphanumeric + underscore
  "email": "string",       // Required: valid email format
  "password": "string",    // Required: 8+ chars, uppercase, lowercase, number
  "avatarId": "string"     // Optional: one of the preset avatar IDs
}
```

#### Success Response (201 Created)

```json
{
  "ok": true,
  "message": "Registration successful",
  "user": {
    "userId": 1,
    "username": "player1",
    "email": "player1@example.com",
    "role": "PLAYER",
    "avatarUrl": "bubbles",
    "status": "ONLINE",
    "createdAt": "2025-10-15T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**400 Bad Request** - Validation error
```json
{
  "ok": false,
  "error": "Validation error",
  "message": "Username, email, and password are required"
}
```

**409 Conflict** - User already exists
```json
{
  "ok": false,
  "error": "Conflict",
  "message": "Username already taken"
}
```

#### Notes
- Refresh token automatically set as HTTP-only cookie
- User status set to ONLINE upon registration
- Default avatar ("andrew") assigned if not provided
- Initial user_stats record created automatically
- User role defaults to PLAYER

---

### 2. Login

**Endpoint:** `POST /api/auth/login`  
**Authentication:** Not required  
**Description:** Authenticate user with email and password.

#### Request Body

```json
{
  "email": "string",       // Required
  "password": "string"     // Required
}
```

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Login successful",
  "user": {
    "userId": 1,
    "username": "player1",
    "email": "player1@example.com",
    "role": "PLAYER",
    "avatarUrl": "bubbles",
    "status": "ONLINE",
    "createdAt": "2025-10-15T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**400 Bad Request** - Missing fields
```json
{
  "ok": false,
  "error": "Validation error",
  "message": "Email and password are required"
}
```

**401 Unauthorized** - Invalid credentials
```json
{
  "ok": false,
  "error": "Authentication failed",
  "message": "Invalid email or password"
}
```

#### Notes
- Email is case-insensitive
- User status updated to ONLINE on successful login
- Refresh token set as HTTP-only cookie (7-day expiry)
- bcrypt used for password comparison (constant-time operation)

---

### 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`  
**Authentication:** Refresh token (from cookie)  
**Description:** Generate a new access token using the refresh token.

#### Request Body

None (refresh token read from HTTP-only cookie)

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Token refreshed",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**401 Unauthorized** - No refresh token
```json
{
  "ok": false,
  "error": "Authentication required",
  "message": "No refresh token provided"
}
```

**401 Unauthorized** - Invalid/expired token
```json
{
  "ok": false,
  "error": "Token expired",
  "message": "Please log in again"
}
```

#### Notes
- Called automatically by frontend when access token expires
- Invalid refresh token is cleared from cookies
- No new refresh token issued (original remains valid)

---

### 4. Logout

**Endpoint:** `POST /api/auth/logout`  
**Authentication:** Required (Bearer token)  
**Description:** Log out the current user and clear refresh token.

#### Request Headers

```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Logout successful"
}
```

#### Error Responses

**401 Unauthorized** - No access token
```json
{
  "ok": false,
  "error": "Authentication required",
  "message": "No access token provided"
}
```

#### Notes
- User status updated to OFFLINE
- Refresh token cookie cleared
- Access token still valid until expiry (stateless JWT)
- Frontend should discard access token immediately

---

### 5. Get Current User

**Endpoint:** `GET /api/auth/me`  
**Authentication:** Required (Bearer token)  
**Description:** Retrieve authenticated user's information.

#### Request Headers

```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)

```json
{
  "ok": true,
  "user": {
    "userId": 1,
    "username": "player1",
    "email": "player1@example.com",
    "role": "PLAYER"
  }
}
```

#### Error Responses

**401 Unauthorized** - No/invalid token
```json
{
  "ok": false,
  "error": "Authentication required",
  "message": "No access token provided"
}
```

#### Notes
- User information extracted from JWT token (no database query)
- Useful for verifying token validity
- Frontend can use this to restore user session on page reload

---

## Authentication Middleware

### `authenticateToken`

Verifies JWT access token and attaches user information to the request.

**Usage:**
```javascript
import { authenticateToken } from './auth/middleware.js';

router.get('/protected', authenticateToken, (req, res) => {
  console.log(req.user); // { id, username, email, role }
  res.json({ message: 'This is protected!' });
});
```

**Attached User Object:**
```javascript
req.user = {
  id: 1,
  username: "player1",
  email: "player1@example.com",
  role: "PLAYER"
}
```

---

### `requireAdmin`

Enforces admin role requirement (must be used after `authenticateToken`).

**Usage:**
```javascript
import { authenticateToken, requireAdmin } from './auth/middleware.js';

router.delete('/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  // Only admins can access this endpoint
});
```

---

### `optionalAuth`

Attaches user if token is present, but doesn't fail if missing.

**Usage:**
```javascript
import { optionalAuth } from './auth/middleware.js';

router.get('/posts', optionalAuth, (req, res) => {
  if (req.user) {
    // Show personalized posts
  } else {
    // Show public posts
  }
});
```

---

## Frontend Integration

### Setup Axios Instance with Interceptors

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true // Important: Send cookies with requests
});

// Request interceptor: Add access token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Auto-refresh expired tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          'http://localhost:3000/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

### Registration Component

```jsx
import React, { useState } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    avatarId: 'andrew'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.post('/auth/register', formData);
      
      // Store access token
      localStorage.setItem('accessToken', data.accessToken);
      
      // Store user info
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <select
        value={formData.avatarId}
        onChange={(e) => setFormData({ ...formData, avatarId: e.target.value })}
      >
        <option value="andrew">Andrew</option>
        <option value="brian">Brian</option>
        <option value="bubbles">Bubbles</option>
        <option value="choomah">Choomah</option>
        <option value="clarence">Clarence</option>
        <option value="homer">Homer</option>
        <option value="nick">Nick</option>
        <option value="stewie">Stewie</option>
      </select>
      {error && <p className="error">{error}</p>}
      <button type="submit">Register</button>
    </form>
  );
}

export default RegisterPage;
```

---

### Login Component

```jsx
import React, { useState } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.post('/auth/login', credentials);
      
      // Store access token
      localStorage.setItem('accessToken', data.accessToken);
      
      // Store user info
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}

export default LoginPage;
```

---

### Protected Route Component

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;

// Usage in App.jsx:
// <Route path="/dashboard" element={
//   <ProtectedRoute>
//     <Dashboard />
//   </ProtectedRoute>
// } />
```

---

### Logout Function

```javascript
import api from './api';

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear local storage, even if API call fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}
```

---

### Auth Context (React Context API)

```jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Usage in components:
// const { user, login, logout } = useAuth();
```

---

## Service Layer Functions

### Password Utilities

#### `hashPassword(password)`
Hashes a plain text password using bcrypt with 12 salt rounds.

```javascript
const hash = await hashPassword('MyPassword123');
// Returns: "$2a$12$..."
```

#### `comparePassword(password, hash)`
Compares plain text password with bcrypt hash (constant-time).

```javascript
const isValid = await comparePassword('MyPassword123', storedHash);
// Returns: true or false
```

#### `validatePassword(password)`
Validates password strength requirements.

```javascript
const result = validatePassword('weak');
// Returns: { valid: false, errors: ['Password must be at least 8 characters', ...] }
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

### JWT Token Utilities

#### `generateAccessToken(user)`
Creates a short-lived JWT access token (15 minutes).

```javascript
const token = generateAccessToken(user);
```

**Token Payload:**
```javascript
{
  id: 1,
  username: "player1",
  email: "player1@example.com",
  role: "PLAYER",
  iat: 1697385600,
  exp: 1697386500
}
```

#### `generateRefreshToken(user)`
Creates a long-lived JWT refresh token (7 days).

```javascript
const refreshToken = generateRefreshToken(user);
```

#### `verifyAccessToken(token)`
Verifies and decodes an access token.

```javascript
try {
  const payload = verifyAccessToken(token);
  console.log(payload.id, payload.username);
} catch (error) {
  // Token invalid or expired
}
```

#### `verifyRefreshToken(token)`
Verifies and decodes a refresh token.

---

### Authentication Functions

#### `registerUser({ username, email, password, avatarId })`
Creates a new user account.

**Returns:**
```javascript
{
  user: { userId, username, email, role, avatarUrl, status, createdAt },
  accessToken: "...",
  refreshToken: "..."
}
```

**Throws:**
- "Invalid email format"
- "Username must be at least 3 characters"
- "Username can only contain letters, numbers, and underscores"
- "Password must be at least 8 characters"
- "Invalid avatar ID"
- "Username already taken"
- "Email already registered"

#### `loginUser({ email, password })`
Authenticates user and generates tokens.

**Returns:** Same as `registerUser`

**Throws:**
- "Invalid email or password"

#### `refreshAccessToken(refreshToken)`
Issues a new access token using a refresh token.

**Returns:**
```javascript
{ accessToken: "..." }
```

**Throws:**
- "Refresh token expired"
- "Invalid refresh token"
- "User not found"

#### `logoutUser(userId)`
Sets user status to OFFLINE.

---

## Database Schema

### Users Table

```sql
users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT DEFAULT 'andrew',
  role VARCHAR(50) DEFAULT 'PLAYER',
  status VARCHAR(50) DEFAULT 'OFFLINE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**Roles:** `PLAYER`, `ADMIN`  
**Status:** `ONLINE`, `OFFLINE`, `IN_GAME`

### User Stats Table

```sql
user_stats (
  stat_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(10, 2) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

## Environment Variables

Required environment variables in `.env`:

```bash
# JWT Secrets (use strong random strings in production)
JWT_SECRET=your-access-token-secret-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Node environment
NODE_ENV=development  # or 'production'

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trivia_db
```

**Generate secure secrets:**
```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Security Best Practices

### Implemented

✅ **Bcrypt with 12+ rounds** - Exceeds project spec requirement  
✅ **HTTP-Only cookies** - Refresh tokens not accessible via JavaScript  
✅ **Secure cookies** - HTTPS-only in production  
✅ **SameSite cookies** - CSRF protection  
✅ **Password validation** - Enforced strength requirements  
✅ **Email validation** - RFC-compliant regex  
✅ **Constant-time comparison** - bcrypt.compare() prevents timing attacks  
✅ **JWT expiry** - Short-lived access tokens reduce risk window  
✅ **Role-based access control** - Admin endpoints protected  
✅ **Prepared statements** - Prisma prevents SQL injection  

### Production Recommendations

🔒 **Rate limiting** - Implement on login/register endpoints (e.g., express-rate-limit)  
🔒 **HTTPS only** - Always use TLS in production  
🔒 **Strong secrets** - Use cryptographically random JWT secrets (64+ bytes)  
🔒 **Token rotation** - Consider rotating refresh tokens on use  
🔒 **Account lockout** - Lock accounts after N failed login attempts  
🔒 **Email verification** - Verify email addresses before activation  
🔒 **Password reset** - Implement secure password reset flow  
🔒 **Audit logging** - Log authentication events for security monitoring  
🔒 **CORS configuration** - Restrict origins in production  
🔒 **Helmet.js** - Add security headers  

---

## Testing

### Manual Testing with cURL

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234",
    "avatarId": "bubbles"
  }' \
  -c cookies.txt
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }' \
  -c cookies.txt
```

**Get Current User:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Refresh Token:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt
```

**Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -b cookies.txt
```

---

## Error Handling

### Common Error Scenarios

| Scenario | Status | Error Code | Message |
|----------|--------|------------|---------|
| Missing required fields | 400 | Validation error | "Username, email, and password are required" |
| Invalid email format | 400 | Validation error | "Invalid email format" |
| Weak password | 400 | Validation error | "Password must be at least 8 characters" |
| Username too short | 400 | Validation error | "Username must be at least 3 characters" |
| Invalid username chars | 400 | Validation error | "Username can only contain letters, numbers, and underscores" |
| Username taken | 409 | Conflict | "Username already taken" |
| Email taken | 409 | Conflict | "Email already registered" |
| Invalid credentials | 401 | Authentication failed | "Invalid email or password" |
| No token provided | 401 | Authentication required | "No access token provided" |
| Token expired | 401 | Token expired | "Access token has expired. Please refresh your token." |
| Invalid token | 403 | Invalid token | "Invalid access token" |
| Not admin | 403 | Forbidden | "Admin access required" |

---

## Known Issues & Limitations

### Current Limitations

1. **No password reset** - Users cannot reset forgotten passwords (bonus feature)
2. **No email verification** - Emails not verified on registration
3. **No rate limiting** - Vulnerable to brute force attacks (should add in production)
4. **No account lockout** - No protection against repeated failed login attempts
5. **No token revocation** - Access tokens valid until expiry (stateless JWT)
6. **No remember me** - Checkbox on frontend, but same 7-day expiry for all users
7. **Single refresh token** - User can only be logged in on one device effectively

### Future Enhancements

- Implement email verification flow
- Add password reset functionality
- Implement rate limiting (express-rate-limit)
- Add account lockout after failed attempts
- Token blacklist for logout (Redis)
- Multi-device support (multiple refresh tokens)
- OAuth integration (Google, GitHub)
- Two-factor authentication (2FA)

---

## Troubleshooting

### "Invalid access token" error
- Check token hasn't expired (15 min lifetime)
- Verify `JWT_SECRET` environment variable is set correctly
- Ensure token is sent in `Authorization: Bearer <token>` header

### "No refresh token provided" error
- Check cookies are enabled in browser
- Verify `withCredentials: true` in axios config
- Ensure CORS allows credentials (`credentials: true`)

### "Username already taken" on registration
- Username must be unique across all users
- Check database for existing user with same username

### Refresh token not working
- Check `JWT_REFRESH_SECRET` is set correctly
- Verify cookies are being sent with request
- Check cookie hasn't expired (7-day lifetime)

### Token refresh loop
- Ensure frontend doesn't retry refresh on 401 from refresh endpoint
- Check `_retry` flag is set correctly in axios interceptor

---

## Contact & Maintenance

This authentication system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/auth/routes.js` - Route definitions
- `server/src/auth/controller.js` - HTTP request handlers
- `server/src/auth/service.js` - Business logic
- `server/src/auth/middleware.js` - Authentication middleware

**Dependencies:**
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `@prisma/client` - Database ORM
- `express` - Web framework
- `cookie-parser` - Cookie parsing

**Last Updated:** 15 October 2025
