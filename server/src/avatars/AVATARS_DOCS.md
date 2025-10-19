# Avatar System Documentation

## Overview

The avatar system provides a curated set of preset user profile images. Users select from a fixed collection of avatars during registration and can change their selection through profile updates. This approach eliminates the complexity of file uploads, storage management, and content moderation while providing a consistent user experience.

## Architecture

### Storage Model

Avatar images are stored in the client codebase at `client/src/data/avatars/`. The backend stores only an avatar identifier (e.g., "bubbles", "homer") in the `users.avatar_url` database field. This decouples the frontend asset management from backend business logic.

### Database Schema

```sql
-- users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),  -- Stores avatar ID (e.g., "bubbles")
  status VARCHAR(50) DEFAULT 'OFFLINE',
  role VARCHAR(50) DEFAULT 'PLAYER',
  created_at TIMESTAMP DEFAULT NOW()
);
```

The `avatar_url` field stores the lowercase avatar identifier, not a URL path. This provides flexibility for the frontend to construct appropriate image paths based on build configuration.

### Component Structure

```
server/src/avatars/
├── config.js       - Avatar constants and validation functions
├── controller.js   - HTTP request handlers
└── routes.js       - Route definitions
```

## Available Avatars

The system provides eight preset avatars:

- andrew (default)
- brian
- bubbles
- choomah
- clarence
- homer
- nick
- stewie

Corresponding image files are located at:
```
client/src/data/avatars/
├── Andrew.png
├── Brian.png
├── Bubbles.png
├── Choomah.png
├── Clarence.png
├── Homer.JPG
├── Nick.png
└── Stewie.png
```

## API Endpoints

### GET /api/avatars

Lists all available avatars with metadata for frontend consumption.

**Authentication:** None required

**Response:**
```json
{
  "ok": true,
  "avatars": [
    {
      "id": "andrew",
      "name": "Andrew",
      "filename": "Andrew.png",
      "url": "/api/avatars/Andrew.png",
      "extension": ".png"
    },
    {
      "id": "bubbles",
      "name": "Bubbles",
      "filename": "Bubbles.png",
      "url": "/api/avatars/Bubbles.png",
      "extension": ".png"
    }
  ],
  "count": 8
}
```

**Intended Use:**
- Populate avatar selection interfaces during registration
- Display available options in profile settings
- Cache response client-side to reduce API calls

**Implementation Notes:**
- Dynamically reads from `client/src/data/avatars/` directory
- Filters for valid image extensions (.png, .jpg, .jpeg, .gif, .svg, .webp)
- Sorts alphabetically by name
- Returns empty array if directory is inaccessible

### GET /api/avatars/:filename

Serves individual avatar image files with case-insensitive filename matching.

**Authentication:** None required

**Parameters:**
- `filename` (string, required) - Image filename (e.g., "Andrew.png", "andrew.png", "ANDREW" all work)

**Features:**
- **Case-insensitive matching** - Handles any case variation (e.g., "bubbles.png", "Bubbles.png", "BUBBLES.PNG")
- **Extension auto-completion** - Supports filename without extension (e.g., "bubbles" finds "bubbles.png")
- **Smart file lookup** - Searches directory for actual file if exact match not found

**Response:**
- Content-Type header set to appropriate MIME type
- Cache-Control header set to `public, max-age=3600`
- Binary image data

**Error Responses:**

400 Bad Request:
```json
{
  "ok": false,
  "error": "Invalid filename"
}
```

404 Not Found:
```json
{
  "ok": false,
  "error": "Avatar not found"
}
```

**Security Measures:**
- Prevents directory traversal attacks (blocks `..`, `/`, `\` in filenames)
- Validates file existence before serving
- Sets appropriate MIME types based on file extension

**Intended Use:**
- During development, serve avatar images directly from backend
- In production, frontend should import and bundle images through build process
- Fallback option if CDN or frontend hosting is unavailable

## Integration Points

### User Registration

The `registerUser` function in `server/src/auth/service.js` accepts an optional `avatarId` parameter.

```javascript
const result = await registerUser({
  username: "johndoe",
  email: "john@example.com",
  password: "SecurePass123",
  avatarId: "bubbles"  // Optional, defaults to "andrew"
});
```

**Validation:**
- If `avatarId` is not provided, defaults to "andrew"
- If provided, validates against `AVAILABLE_AVATARS` list
- Throws error if avatar ID is invalid
- Stores lowercase version in database

**Database Storage:**
```javascript
// Stored in users table
{
  avatar_url: "bubbles"  // Lowercase identifier
}
```

### Profile Updates

The `updateProfile` function in `server/src/user/service.js` accepts `avatarId` in the updates object.

```javascript
await updateProfile(userId, {
  username: "newname",       // Optional
  avatarId: "homer",         // Optional
  currentPassword: "old",    // Required if changing password
  newPassword: "new"         // Optional
});
```

**Validation:**
- Validates avatar ID against `AVAILABLE_AVATARS`
- Throws descriptive error if invalid: "Invalid avatar ID. Must be one of: andrew, brian, bubbles, choomah, clarence, homer, nick, stewie"
- Updates `avatar_url` field with lowercase identifier

### Validation Functions

Located in `server/src/avatars/config.js`:

**isValidAvatarId(avatarId)**
```javascript
import { isValidAvatarId } from '../avatars/config.js';

if (!isValidAvatarId("bubbles")) {
  throw new Error("Invalid avatar");
}
```

**getAvatarFilename(avatarId)**
```javascript
import { getAvatarFilename } from '../avatars/config.js';

const filename = getAvatarFilename("homer");  // Returns "Homer.JPG"
```

## Frontend Integration

### Registration Flow

```javascript
// 1. Fetch available avatars
const response = await fetch('/api/avatars');
const { avatars } = await response.json();

// 2. Display avatar picker
const selectedAvatarId = "bubbles";  // User selection

// 3. Submit registration
await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: "johndoe",
    email: "john@example.com",
    password: "SecurePass123",
    avatarId: selectedAvatarId
  })
});
```

### Profile Update Flow

```javascript
// Update user avatar
await fetch('/api/users/me/profile', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    avatarId: "homer"
  })
});
```

### Displaying Avatars

**Option 1: Import Assets (Recommended for Production)**
```javascript
import AndrewImg from './data/avatars/Andrew.png';
import BubblesImg from './data/avatars/Bubbles.png';

const avatarMap = {
  'andrew': AndrewImg,
  'bubbles': BubblesImg,
  // ... map all 8
};

function UserAvatar({ user }) {
  const src = avatarMap[user.avatarUrl] || avatarMap['andrew'];
  return <img src={src} alt={user.username} />;
}
```

**Option 2: API Endpoint (Development/Fallback)**
```javascript
function UserAvatar({ user }) {
  const filename = getFilenameForId(user.avatarUrl);
  return <img src={`/api/avatars/${filename}`} alt={user.username} />;
}
```

## Error Handling

### Registration Errors

```javascript
try {
  await registerUser({ username, email, password, avatarId: "invalid" });
} catch (error) {
  // error.message: "Invalid avatar ID"
}
```

### Profile Update Errors

```javascript
try {
  await updateProfile(userId, { avatarId: "notreal" });
} catch (error) {
  // error.message: "Invalid avatar ID. Must be one of: andrew, brian, ..."
}
```

### API Endpoint Errors

**GET /api/avatars** - Returns empty array if directory read fails  
**GET /api/avatars/:filename** - Returns 404 if file not found, 400 if invalid filename

## Database Seed Data

The seed script (`server/prisma/seed.js`) creates example users with avatars:

```javascript
await prisma.users.create({
  data: {
    username: 'alice',
    email: 'alice@example.com',
    password_hash: 'hashedpassword',
    avatar_url: 'bubbles'  // Pre-assigned avatar
  }
});
```

## Testing

Avatar validation is tested through profile endpoint tests in `tests/test-profile.sh`:

```bash
# Test avatar update
curl -X PATCH http://localhost:3001/api/users/me/profile \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"avatarId": "bubbles"}'
```

Expected behaviors:
- Valid avatar IDs are accepted and stored
- Invalid avatar IDs return descriptive errors
- Missing avatar ID in registration defaults to "andrew"
- Profile retrieval returns stored avatar ID

## Configuration

To add new avatars:

1. Add image file to `client/src/data/avatars/`
2. Update `AVAILABLE_AVATARS` array in `server/src/avatars/config.js`
3. Update `getAvatarFilename` mapping if filename differs from lowercase ID
4. Update frontend avatar import map

Example:
```javascript
// config.js
export const AVAILABLE_AVATARS = [
  'andrew', 'brian', 'bubbles', 'choomah',
  'clarence', 'homer', 'nick', 'stewie',
  'newavatar'  // New addition
];

// Update mapping
const filenameMap = {
  // ... existing
  'newavatar': 'NewAvatar.png'
};
```

## Security Considerations

- No file uploads accepted, eliminating upload vulnerabilities
- Directory traversal protection in image serving endpoint
- Avatar IDs validated against whitelist
- MIME types explicitly set to prevent content-type confusion
- No user-controlled content in filesystem paths

## Performance

- Avatar list endpoint reads filesystem once per request
- Image serving includes 1-hour cache headers
- Frontend can cache avatar list indefinitely (static data)
- Images should be bundled with frontend build for optimal performance
- Backend serving intended as development convenience, not production solution

## Production Recommendations

1. Bundle avatar images with frontend build process
2. Serve images from CDN or static asset host
3. Use backend endpoints only as fallback or during development
4. Consider implementing avatar versioning if images are updated
5. Monitor `GET /api/avatars` usage and implement caching layer if needed

## Maintenance

The system requires minimal maintenance:

- Avatar additions require code changes (see Configuration section)
- No database migrations needed for new avatars
- No storage cleanup or file management required
- Avatar images should be optimized before adding to repository
