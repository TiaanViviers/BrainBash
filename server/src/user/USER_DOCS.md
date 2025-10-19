# User Management System Documentation

## Overview

The user management system provides comprehensive functionality for user profiles, profile updates, search capabilities, match history tracking, and account management. The system follows a layered architecture with separation between business logic, request handling, and routing.

## Architecture

### Component Structure

```
server/src/user/
├── service.js      - Business logic and database operations
├── controller.js   - HTTP request handlers and validation
└── routes.js       - Route definitions and middleware
```

### Database Schema

The user system interacts with multiple database tables:

```sql
-- Primary user table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'OFFLINE',
  role VARCHAR(50) DEFAULT 'PLAYER',
  created_at TIMESTAMP DEFAULT NOW()
);

-- User statistics
CREATE TABLE user_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  average_score DECIMAL DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  last_played_at TIMESTAMP
);
```

## API Endpoints

### Public Endpoints

#### GET /api/users/search

Search for users by username using case-insensitive partial matching.

**Authentication:** None required

**Query Parameters:**
- `q` (string, required) - Search query, minimum 2 characters
- `limit` (integer, optional) - Results limit, range 1-50, default 10

**Response:**
```json
{
  "ok": true,
  "users": [
    {
      "userId": 42,
      "username": "johndoe",
      "avatarUrl": "bubbles",
      "status": "ONLINE",
      "createdAt": "2025-10-15T10:00:00Z",
      "stats": {
        "gamesPlayed": 15,
        "gamesWon": 8,
        "totalScore": 12500,
        "averageScore": 833
      }
    }
  ],
  "count": 1
}
```

**Error Responses:**

400 Bad Request - Missing query:
```json
{
  "ok": false,
  "error": "Query parameter \"q\" is required and must be a non-empty string"
}
```

400 Bad Request - Query too short:
```json
{
  "ok": false,
  "error": "Search query must be at least 2 characters long"
}
```

400 Bad Request - Invalid limit:
```json
{
  "ok": false,
  "error": "Limit must be a number between 1 and 50"
}
```

**Intended Use:**
- User search in match invitation interfaces
- Friend search functionality
- Leaderboard filtering
- Administrative user lookup

**Implementation Details:**
- Case-insensitive search using Prisma's `mode: 'insensitive'`
- Returns public information only (no email, password)
- Ordered alphabetically by username
- Includes basic statistics if available

---

---

### 6. Get User by ID

**Endpoint:** `GET /api/users/:userId`  
**Authentication:** Public (no token required)  
**Description:** Get public profile information for a specific user.

---

### Protected Endpoints

All protected endpoints require JWT authentication via Bearer token in Authorization header.

#### GET /api/users/me/profile

Retrieve authenticated user's complete profile including private information.

**Authentication:** Required (JWT Bearer token)

**Response:**
```json
{
  "ok": true,
  "profile": {
    "userId": 42,
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "bubbles",
    "status": "ONLINE",
    "role": "PLAYER",
    "memberSince": "2025-10-15T10:00:00Z",
    "stats": {
      "gamesPlayed": 15,
      "gamesWon": 8,
      "totalScore": 12500,
      "highestScore": 950,
      "averageScore": 833,
      "correctAnswers": 45,
      "totalAnswers": 60,
      "accuracy": 75.0,
      "avgResponseTime": 2500,
      "lastPlayedAt": "2025-10-14T18:30:00Z"
    }
  }
}
```

**Error Responses:**

401 Unauthorized - Missing or invalid token:
```json
{
  "ok": false,
  "error": "Authentication required",
  "message": "No access token provided"
}
```

404 Not Found - Profile not found:
```json
{
  "ok": false,
  "error": "Profile not found"
}
```

**Intended Use:**
- Profile page data loading
- Settings page display
- User dashboard statistics
- Account information display

**Implementation Details:**
- Includes email address (only for own profile)
- User ID extracted from JWT token payload
- Accuracy returned as float with one decimal place
- Returns null stats for new users who haven't played

---

#### PATCH /api/users/me/profile

Update authenticated user's profile information.

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "username": "newusername",
  "avatarId": "homer",
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

All fields are optional. Partial updates are supported.

**Response:**
```json
{
  "ok": true,
  "profile": {
    "userId": 42,
    "username": "newusername",
    "email": "john@example.com",
    "avatarUrl": "homer",
    "status": "ONLINE",
    "role": "PLAYER",
    "memberSince": "2025-10-15T10:00:00Z",
    "stats": { ... }
  },
  "message": "Profile updated successfully"
}
```

**Validation Rules:**

Username:
- Must be non-empty string
- Length between 3 and 30 characters
- Must be unique across all users

Avatar ID:
- Must be valid preset avatar identifier
- Validated against: andrew, brian, bubbles, choomah, clarence, homer, nick, stewie
- Stored in lowercase

Password:
- New password requires minimum 8 characters
- Current password must be provided and correct
- Hashed using bcrypt with 12 salt rounds

**Error Responses:**

400 Bad Request - Username too short:
```json
{
  "ok": false,
  "error": "Username must be at least 3 characters long"
}
```

400 Bad Request - Username too long:
```json
{
  "ok": false,
  "error": "Username must be at most 30 characters long"
}
```

400 Bad Request - Username taken:
```json
{
  "ok": false,
  "error": "Username already taken"
}
```

400 Bad Request - Invalid avatar:
```json
{
  "ok": false,
  "error": "Invalid avatar ID. Must be one of: andrew, brian, bubbles, choomah, clarence, homer, nick, stewie"
}
```

400 Bad Request - Missing current password:
```json
{
  "ok": false,
  "error": "Current password is required to change password"
}
```

400 Bad Request - Incorrect current password:
```json
{
  "ok": false,
  "error": "Current password is incorrect"
}
```

400 Bad Request - New password too short:
```json
{
  "ok": false,
  "error": "New password must be at least 8 characters long"
}
```

**Intended Use:**
- Profile settings page
- Username change functionality
- Avatar selection interface
- Password change form

**Implementation Details:**
- Username uniqueness checked across all users except current user
- Avatar validated using `isValidAvatarId()` from avatars module
- Password comparison uses bcrypt secure comparison
- Returns complete updated profile after successful update
- No update performed if no fields provided (returns current profile)

---

#### GET /api/users/me/matches

Retrieve authenticated user's match history with pagination.

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**
- `limit` (integer, optional) - Results per page, range 1-50, default 10
- `offset` (integer, optional) - Number of results to skip, default 0

**Response:**
```json
{
  "ok": true,
  "matches": [
    {
      "matchId": 45,
      "status": "FINISHED",
      "difficulty": "MEDIUM",
      "startTime": "2025-10-14T18:00:00Z",
      "endTime": "2025-10-14T18:30:00Z",
      "myScore": {
        "totalScore": 850,
        "correctAnswers": 8,
        "totalQuestions": 10,
        "avgResponseTime": 2500
      },
      "placement": {
        "rank": 2,
        "totalPlayers": 4
      },
      "players": [
        {
          "userId": 10,
          "username": "alice",
          "avatarUrl": "bubbles",
          "score": 920
        },
        {
          "userId": 42,
          "username": "johndoe",
          "avatarUrl": "homer",
          "score": 850
        },
        {
          "userId": 15,
          "username": "bob",
          "avatarUrl": "andrew",
          "score": 780
        }
      ],
      "winner": false
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

**Error Responses:**

400 Bad Request - Invalid limit:
```json
{
  "ok": false,
  "error": "Limit must be a number between 1 and 50"
}
```

400 Bad Request - Invalid offset:
```json
{
  "ok": false,
  "error": "Offset must be a non-negative number"
}
```

**Intended Use:**
- Match history page
- Profile statistics detail view
- Performance tracking
- Recent activity display

**Implementation Details:**
- Returns only finished matches (excludes in-progress or abandoned)
- Ordered by `end_time` descending (most recent first)
- Rank calculated based on score ordering within match
- Winner flag indicates if user had highest score
- Players array sorted by score descending
- Pagination supports infinite scroll or page-based navigation

---

#### DELETE /api/users/me/account

Permanently anonymize authenticated user's account while preserving match history.

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "password": "CurrentPassword123"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Account deleted successfully"
}
```

**Error Responses:**

400 Bad Request - Missing password:
```json
{
  "ok": false,
  "error": "Password is required for account deletion"
}
```

400 Bad Request - Incorrect password:
```json
{
  "ok": false,
  "error": "Incorrect password"
}
```

**Anonymization Process:**

The account is not deleted but anonymized to preserve match history integrity:

1. Username changed to: `Deleted User {userId}`
2. Email changed to: `deleted_{userId}@deleted.local`
3. Password replaced with random secure hash
4. Avatar URL set to null
5. Status set to OFFLINE
6. Match history preserved
7. Statistics preserved

**Intended Use:**
- Account deletion requests
- GDPR compliance (right to be forgotten)
- User privacy management
- Account termination

**Implementation Details:**
- Password verified using bcrypt before deletion
- Match history and statistics remain intact for other users
- Anonymized accounts cannot be recovered
- Username and email patterns prevent accidental recreation
- Random password hash ensures account is inaccessible

---

## Service Layer Functions

### searchUsersByUsername(query, limit)

Search for users matching the provided username query.

**Parameters:**
- `query` (string) - Search term
- `limit` (number) - Maximum results, default 10

**Returns:** Array of user objects with public information

**Database Operations:**
- `prisma.users.findMany()` with case-insensitive contains filter
- Includes user_stats relation
- Orders by username ascending

---

### getUserById(userId)

Retrieve public profile for specified user.

**Parameters:**
- `userId` (number) - User ID

**Returns:** User object or null if not found

**Database Operations:**
- `prisma.users.findUnique()` with stats relation
- Includes accuracy calculation

---

### getMyProfile(userId)

Retrieve complete profile for authenticated user including email.

**Parameters:**
- `userId` (number) - Authenticated user ID from JWT

**Returns:** Profile object or null if not found

**Database Operations:**
- `prisma.users.findUnique()` with stats relation
- Includes all sensitive information

---

### updateProfile(userId, updates)

Update user profile fields.

**Parameters:**
- `userId` (number) - User ID
- `updates` (object) - Fields to update
  - `username` (string, optional)
  - `avatarId` (string, optional)
  - `currentPassword` (string, required if changing password)
  - `newPassword` (string, optional)

**Returns:** Updated profile object

**Validation:**
- Username uniqueness checked
- Avatar ID validated against preset list
- Current password verified for password changes
- New password strength validated

**Database Operations:**
- `prisma.users.findUnique()` to fetch current data
- Username uniqueness check via `prisma.users.findUnique()`
- `prisma.users.update()` to apply changes
- Returns updated profile via `getMyProfile()`

---

### getMatchHistory(userId, options)

Retrieve paginated match history for user.

**Parameters:**
- `userId` (number) - User ID
- `options` (object)
  - `limit` (number) - Results per page, default 10
  - `offset` (number) - Skip count, default 0

**Returns:** Array of match objects with scores and rankings

**Database Operations:**
- `prisma.matches.findMany()` with complex relations
- Includes match_players, user, and scores relations
- Filters for finished matches only
- Orders by end_time descending

**Computed Fields:**
- Rank calculated from score ordering
- Winner flag based on highest score
- Players sorted by score

---

### deleteAccount(userId, password)

Anonymize user account after password verification.

**Parameters:**
- `userId` (number) - User ID
- `password` (string) - Current password for confirmation

**Returns:** Success object with message

**Database Operations:**
- `prisma.users.findUnique()` to fetch current password hash
- Password verification via bcrypt
- `prisma.users.update()` to anonymize account

**Security:**
- Password must match current hash
- New password hash randomly generated
- Irreversible operation

---

## Frontend Integration

### Authentication

All protected endpoints require JWT Bearer token:

```javascript
const response = await fetch('/api/users/me/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

Token obtained from login or registration endpoints in auth module.

---

### Search Users

```javascript
const searchUsers = async (query) => {
  const params = new URLSearchParams({ q: query, limit: 20 });
  const response = await fetch(`/api/users/search?${params}`);
  const { users } = await response.json();
  return users;
};
```

---

### View Profile

Public profile (any user):
```javascript
const getPublicProfile = async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  const { user } = await response.json();
  return user;
};
```

Own profile (authenticated):
```javascript
const getMyProfile = async (token) => {
  const response = await fetch('/api/users/me/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { profile } = await response.json();
  return profile;
};
```

---

### Update Profile

```javascript
const updateProfile = async (token, updates) => {
  const response = await fetch('/api/users/me/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error);
  }
  
  const { profile } = await response.json();
  return profile;
};

// Usage examples
await updateProfile(token, { username: 'newname' });
await updateProfile(token, { avatarId: 'homer' });
await updateProfile(token, {
  currentPassword: 'old',
  newPassword: 'new123456'
});
```

---

### Match History

```javascript
const getMatchHistory = async (token, page = 0, pageSize = 10) => {
  const params = new URLSearchParams({
    limit: pageSize,
    offset: page * pageSize
  });
  
  const response = await fetch(`/api/users/me/matches?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { matches, count } = await response.json();
  return { matches, hasMore: count === pageSize };
};
```

---

### Delete Account

```javascript
const deleteAccount = async (token, password) => {
  const response = await fetch('/api/users/me/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
  
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error);
  }
  
  const { message } = await response.json();
  return message;
};
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "ok": false,
  "error": "Error message description"
}
```

Common HTTP status codes:

- 200 OK - Successful request
- 400 Bad Request - Validation error or invalid input
- 401 Unauthorized - Missing or invalid authentication token
- 404 Not Found - Resource does not exist
- 500 Internal Server Error - Unexpected server error

Controllers validate input and return appropriate error responses. Unexpected errors pass through to global error handler.

---

## Security Considerations

### Password Handling

- Passwords never returned in responses
- Current password required for password changes
- Bcrypt used for hashing with 12 salt rounds
- Secure comparison prevents timing attacks

### Data Privacy

- Email only included in own profile endpoint
- Public endpoints exclude sensitive information
- Account deletion anonymizes rather than deletes
- Match history preserved for data integrity

### Input Validation

- Username length and uniqueness enforced
- Avatar IDs validated against whitelist
- Pagination parameters bounded
- User IDs validated as positive integers

### Authentication

- JWT tokens verified via middleware
- Token expiry enforced
- User ID extracted from token payload, not request parameters

---

## Database Performance

### Indexes

Recommended indexes for optimal performance:

```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_match_players_user_id ON match_players(user_id);
CREATE INDEX idx_scores_user_id ON scores(user_id);
```

### Query Optimization

- User search uses indexed username column
- Match history includes necessary relations in single query
- Statistics joined via Prisma relations
- Pagination implemented at database level

---

## Testing

Test coverage provided by `tests/test-profile.sh`:

1. Profile retrieval (authenticated)
2. Username update with validation
3. Avatar update with validation
4. Password change with verification
5. Match history pagination
6. Account deletion with anonymization

Run tests:
```bash
./tests/test-profile.sh
```

Expected behavior:
- All validation rules enforced
- Error responses match specification
- Updates persist to database
- Anonymization irreversible
- Authentication required for protected endpoints
