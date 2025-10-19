# Match Invitation System Documentation

## Overview

The match invitation system allows match hosts and players to invite other users to join trivia matches. Users can send invites, receive invites, accept or decline them, and track invitation status. The system ensures proper authorization and prevents duplicate invitations or invalid match states.

### Key Features

- **Send Invitations** - Invite users to join matches
- **Receive Notifications** - View pending invitations
- **Accept/Decline** - Respond to invitations
- **Cancel Invites** - Senders can cancel pending invites
- **Status Tracking** - Track invite status (pending, accepted, declined)
- **Authorization** - Only authorized users can perform actions
- **Validation** - Prevents duplicate invites, self-invites, and invalid match states
- **Real-time Ready** - Designed to work with WebSocket notifications

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
│  Invite Routes   │  ← /api/invites
│  (routes.js)     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Invite Controller│  ← HTTP handlers
│ (controller.js)  │     Input validation
└────────┬─────────┘     Response formatting
         ↓
┌──────────────────┐
│ Invite Service   │  ← Business logic
│  (service.js)    │     Authorization checks
└────────┬─────────┘     Database queries
         ↓
┌──────────────────┐
│  Prisma ORM      │  ← Database access
│  (PostgreSQL)    │
└──────────────────┘
```

---

## API Endpoints

### 1. Send Invitation

**Endpoint:** `POST /api/invites`  
**Authentication:** Required (Bearer token)  
**Description:** Send a match invitation to another user.

#### Request Body

```json
{
  "matchId": 1,
  "senderId": 2,
  "recipientId": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| matchId | integer | Yes | ID of the match to invite to |
| senderId | integer | Yes | ID of user sending invite (must match authenticated user) |
| recipientId | integer | Yes | ID of user to invite |

#### Success Response (201 Created)

```json
{
  "ok": true,
  "invite": {
    "inviteId": 1,
    "matchId": 1,
    "senderId": 2,
    "recipientId": 3,
    "status": "pending",
    "sentAt": "2025-10-15T14:30:00.000Z",
    "respondedAt": null,
    "match": {
      "matchId": 1,
      "status": "scheduled",
      "difficulty": "medium",
      "startTime": "2025-10-15T15:00:00.000Z",
      "createdAt": "2025-10-15T14:00:00.000Z",
      "host": {
        "user_id": 1,
        "username": "host_player",
        "avatar_url": "bubbles"
      },
      "playerCount": 2
    },
    "sender": {
      "user_id": 2,
      "username": "inviter",
      "avatar_url": "homer"
    },
    "recipient": {
      "user_id": 3,
      "username": "invitee",
      "avatar_url": "stewie"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Missing fields
```json
{
  "ok": false,
  "error": "matchId, recipientId, and senderId are required"
}
```

**400 Bad Request** - Invalid IDs
```json
{
  "ok": false,
  "error": "matchId, recipientId, and senderId must be valid numbers"
}
```

**400 Bad Request** - Self-invite
```json
{
  "ok": false,
  "error": "Cannot invite yourself"
}
```

**400 Bad Request** - User already invited
```json
{
  "ok": false,
  "error": "User already has a pending invite for this match"
}
```

**400 Bad Request** - User already in match
```json
{
  "ok": false,
  "error": "User is already in this match"
}
```

**400 Bad Request** - Match already started
```json
{
  "ok": false,
  "error": "Cannot invite to a match that has already started or finished"
}
```

#### Validation Rules
- Sender and recipient must be different users
- Recipient cannot already have a pending invite for this match
- Recipient cannot already be in the match
- Match must exist and be in "scheduled" status
- Recipient user must exist in database

---

### 2. Get Received Invitations

**Endpoint:** `GET /api/invites/received?userId={userId}&status={status}`  
**Authentication:** Required (Bearer token)  
**Description:** Get all invitations received by a user.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | integer | Yes | ID of user to get invites for |
| status | string | No | Filter by status: `pending`, `accepted`, `declined` |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "invites": [
    {
      "inviteId": 1,
      "matchId": 1,
      "senderId": 2,
      "recipientId": 3,
      "status": "pending",
      "sentAt": "2025-10-15T14:30:00.000Z",
      "respondedAt": null,
      "match": {
        "matchId": 1,
        "status": "scheduled",
        "difficulty": "medium",
        "startTime": "2025-10-15T15:00:00.000Z",
        "createdAt": "2025-10-15T14:00:00.000Z",
        "host": {
          "user_id": 1,
          "username": "host_player",
          "avatar_url": "bubbles"
        },
        "playerCount": 2
      },
      "sender": {
        "user_id": 2,
        "username": "inviter",
        "avatar_url": "homer"
      }
    }
  ],
  "count": 1
}
```

#### Error Responses

**400 Bad Request** - Missing userId
```json
{
  "ok": false,
  "error": "userId query parameter is required"
}
```

**400 Bad Request** - Invalid status
```json
{
  "ok": false,
  "error": "status must be one of: pending, accepted, declined"
}
```

#### Usage Notes
- Returns invites sorted by sent date (most recent first)
- Use `status=pending` to show only actionable invites
- Include match details to display invitation context

---

### 3. Get Sent Invitations

**Endpoint:** `GET /api/invites/sent?userId={userId}&status={status}`  
**Authentication:** Required (Bearer token)  
**Description:** Get all invitations sent by a user.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | integer | Yes | ID of user who sent invites |
| status | string | No | Filter by status: `pending`, `accepted`, `declined` |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "invites": [
    {
      "inviteId": 1,
      "matchId": 1,
      "senderId": 2,
      "recipientId": 3,
      "status": "accepted",
      "sentAt": "2025-10-15T14:30:00.000Z",
      "respondedAt": "2025-10-15T14:35:00.000Z",
      "match": {
        "matchId": 1,
        "status": "scheduled",
        "difficulty": "medium",
        "startTime": "2025-10-15T15:00:00.000Z",
        "createdAt": "2025-10-15T14:00:00.000Z",
        "host": {
          "user_id": 1,
          "username": "host_player",
          "avatar_url": "bubbles"
        }
      },
      "recipient": {
        "user_id": 3,
        "username": "invitee",
        "avatar_url": "stewie"
      }
    }
  ],
  "count": 1
}
```

#### Usage Notes
- Shows who you've invited and their response status
- Use `status=pending` to find invites you can cancel
- Sorted by sent date (most recent first)

---

### 4. Get Match Invitations (Host Only)

**Endpoint:** `GET /api/invites/match/:matchId?userId={userId}`  
**Authentication:** Required (Bearer token)  
**Description:** Get all invitations for a specific match (host only).

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| matchId | integer | path | Yes | ID of the match |
| userId | integer | query | Yes | ID of requesting user (must be host) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "invites": [
    {
      "inviteId": 1,
      "matchId": 1,
      "senderId": 1,
      "recipientId": 3,
      "status": "pending",
      "sentAt": "2025-10-15T14:30:00.000Z",
      "respondedAt": null,
      "sender": {
        "user_id": 1,
        "username": "host_player",
        "avatar_url": "bubbles"
      },
      "recipient": {
        "user_id": 3,
        "username": "invitee",
        "avatar_url": "stewie",
        "status": "ONLINE"
      }
    }
  ],
  "count": 1
}
```

#### Error Responses

**400 Bad Request** - Missing userId
```json
{
  "ok": false,
  "error": "userId query parameter is required (to verify host)"
}
```

**403 Forbidden** - Not authorized
```json
{
  "ok": false,
  "error": "You are not authorized to view invites for this match"
}
```

#### Usage Notes
- Only match host can view all invites for their match
- Shows recipient online status (useful for deciding who to invite)
- Used in match lobby to track who's been invited

---

### 5. Accept Invitation

**Endpoint:** `PUT /api/invites/:inviteId/accept`  
**Authentication:** Required (Bearer token)  
**Description:** Accept a match invitation and join the match.

#### Request Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| inviteId | integer | path | Yes | ID of the invitation |

#### Request Body

```json
{
  "userId": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | integer | Yes | ID of user accepting (must be recipient) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Invite accepted successfully",
  "invite": {
    "inviteId": 1,
    "matchId": 1,
    "senderId": 2,
    "recipientId": 3,
    "status": "accepted",
    "sentAt": "2025-10-15T14:30:00.000Z",
    "respondedAt": "2025-10-15T14:35:00.000Z",
    "match": {
      "matchId": 1,
      "status": "scheduled",
      "difficulty": "medium",
      "startTime": "2025-10-15T15:00:00.000Z",
      "createdAt": "2025-10-15T14:00:00.000Z",
      "host": {
        "user_id": 1,
        "username": "host_player",
        "avatar_url": "bubbles"
      }
    },
    "sender": {
      "user_id": 2,
      "username": "inviter",
      "avatar_url": "homer"
    },
    "recipient": {
      "user_id": 3,
      "username": "invitee",
      "avatar_url": "stewie"
    }
  },
  "matchPlayer": {
    "matchPlayerId": 5,
    "matchId": 1,
    "userId": 3,
    "score": 0,
    "joinedAt": "2025-10-15T14:35:00.000Z",
    "user": {
      "user_id": 3,
      "username": "invitee",
      "avatar_url": "stewie"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Missing userId
```json
{
  "ok": false,
  "error": "userId is required in request body"
}
```

**400 Bad Request** - Not authorized
```json
{
  "ok": false,
  "error": "You are not authorized to accept this invite"
}
```

**400 Bad Request** - Already responded
```json
{
  "ok": false,
  "error": "This invite has already been responded to"
}
```

**400 Bad Request** - Match already started
```json
{
  "ok": false,
  "error": "Cannot accept invite for a match that has already started or finished"
}
```

#### Atomic Operation
- Uses database transaction to ensure atomicity
- Updates invite status AND adds player to match
- If either fails, both are rolled back

---

### 6. Decline Invitation

**Endpoint:** `PUT /api/invites/:inviteId/decline`  
**Authentication:** Required (Bearer token)  
**Description:** Decline a match invitation.

#### Request Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| inviteId | integer | path | Yes | ID of the invitation |

#### Request Body

```json
{
  "userId": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | integer | Yes | ID of user declining (must be recipient) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Invite declined successfully",
  "invite": {
    "inviteId": 1,
    "matchId": 1,
    "senderId": 2,
    "recipientId": 3,
    "status": "declined",
    "sentAt": "2025-10-15T14:30:00.000Z",
    "respondedAt": "2025-10-15T14:35:00.000Z",
    "match": {
      "matchId": 1,
      "status": "scheduled",
      "difficulty": "medium",
      "startTime": "2025-10-15T15:00:00.000Z",
      "createdAt": "2025-10-15T14:00:00.000Z",
      "host": {
        "user_id": 1,
        "username": "host_player",
        "avatar_url": "bubbles"
      }
    },
    "sender": {
      "user_id": 2,
      "username": "inviter",
      "avatar_url": "homer"
    },
    "recipient": {
      "user_id": 3,
      "username": "invitee",
      "avatar_url": "stewie"
    }
  }
}
```

#### Error Responses

Same as Accept Invitation errors.

---

### 7. Cancel Invitation (Sender Only)

**Endpoint:** `DELETE /api/invites/:inviteId?userId={userId}`  
**Authentication:** Required (Bearer token)  
**Description:** Cancel a pending invitation (sender only).

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| inviteId | integer | path | Yes | ID of the invitation |
| userId | integer | query | Yes | ID of user canceling (must be sender) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Invite cancelled successfully"
}
```

#### Error Responses

**400 Bad Request** - Missing userId
```json
{
  "ok": false,
  "error": "userId query parameter is required"
}
```

**400 Bad Request** - Not authorized
```json
{
  "ok": false,
  "error": "Only the sender can cancel this invite"
}
```

**400 Bad Request** - Already responded
```json
{
  "ok": false,
  "error": "Cannot cancel an invite that has already been responded to"
}
```

#### Usage Notes
- Only sender can cancel their own invites
- Can only cancel pending invites (not accepted/declined)
- Permanently deletes the invitation record

---

## Frontend Integration

### Send Invitation

```jsx
import React, { useState } from 'react';
import api from './api';

function InvitePlayerButton({ matchId, recipientId, senderId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendInvite = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/invites', {
        matchId,
        senderId,
        recipientId
      });

      alert('Invitation sent!');
      onSuccess?.(data.invite);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={sendInvite} disabled={loading}>
        {loading ? 'Sending...' : 'Invite to Match'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default InvitePlayerButton;
```

---

### Display Received Invitations

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import { useAuth } from './AuthContext';

function ReceivedInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, [user.userId]);

  const fetchInvites = async () => {
    try {
      const { data } = await api.get('/invites/received', {
        params: {
          userId: user.userId,
          status: 'pending'
        }
      });
      setInvites(data.invites);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId) => {
    try {
      await api.put(`/invites/${inviteId}/accept`, {
        userId: user.userId
      });
      alert('Invitation accepted! Redirecting to match...');
      fetchInvites(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept invite');
    }
  };

  const handleDecline = async (inviteId) => {
    try {
      await api.put(`/invites/${inviteId}/decline`, {
        userId: user.userId
      });
      fetchInvites(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to decline invite');
    }
  };

  if (loading) return <div>Loading invitations...</div>;
  if (invites.length === 0) return <div>No pending invitations</div>;

  return (
    <div className="invites-list">
      <h2>Pending Invitations ({invites.length})</h2>
      {invites.map(invite => (
        <div key={invite.inviteId} className="invite-card">
          <div className="invite-info">
            <img src={`/avatars/${invite.sender.avatar_url}.png`} alt="" />
            <div>
              <p><strong>{invite.sender.username}</strong> invited you to a match</p>
              <p>Difficulty: {invite.match.difficulty}</p>
              <p>Starts: {new Date(invite.match.startTime).toLocaleString()}</p>
              <p className="sent-time">
                Sent {new Date(invite.sentAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="invite-actions">
            <button 
              onClick={() => handleAccept(invite.inviteId)}
              className="accept-button"
            >
              Accept
            </button>
            <button 
              onClick={() => handleDecline(invite.inviteId)}
              className="decline-button"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReceivedInvites;
```

---

### Display Sent Invitations

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import { useAuth } from './AuthContext';

function SentInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, [user.userId]);

  const fetchInvites = async () => {
    try {
      const { data } = await api.get('/invites/sent', {
        params: {
          userId: user.userId
        }
      });
      setInvites(data.invites);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (inviteId) => {
    const confirmed = window.confirm('Cancel this invitation?');
    if (!confirmed) return;

    try {
      await api.delete(`/invites/${inviteId}`, {
        params: { userId: user.userId }
      });
      fetchInvites(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel invite');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (invites.length === 0) return <div>No invitations sent</div>;

  return (
    <div className="sent-invites">
      <h2>Sent Invitations ({invites.length})</h2>
      {invites.map(invite => (
        <div key={invite.inviteId} className="invite-card">
          <div className="invite-info">
            <img src={`/avatars/${invite.recipient.avatar_url}.png`} alt="" />
            <div>
              <p>Invited <strong>{invite.recipient.username}</strong></p>
              <p>Status: <span className={`status-${invite.status}`}>{invite.status}</span></p>
              <p>Sent: {new Date(invite.sentAt).toLocaleString()}</p>
              {invite.respondedAt && (
                <p>Responded: {new Date(invite.respondedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
          {invite.status === 'pending' && (
            <button 
              onClick={() => handleCancel(invite.inviteId)}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default SentInvites;
```

---

### Match Lobby Invite Manager (Host View)

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import { useAuth } from './AuthContext';

function MatchInviteManager({ matchId }) {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMatchInvites();
  }, [matchId]);

  const fetchMatchInvites = async () => {
    try {
      const { data } = await api.get(`/invites/match/${matchId}`, {
        params: { userId: user.userId }
      });
      setInvites(data.invites);
    } catch (err) {
      console.error('Failed to load invites:', err);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.get('/users/search', {
        params: { q: searchQuery }
      });
      setSearchResults(data.users);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (recipientId) => {
    try {
      await api.post('/invites', {
        matchId,
        senderId: user.userId,
        recipientId
      });
      alert('Invitation sent!');
      fetchMatchInvites(); // Refresh
      setSearchResults([]); // Clear search
      setSearchQuery('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send invite');
    }
  };

  return (
    <div className="invite-manager">
      <h3>Invite Players</h3>
      
      <div className="search-box">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
        />
        <button onClick={searchUsers} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Search Results</h4>
          {searchResults.map(user => (
            <div key={user.userId} className="user-result">
              <img src={`/avatars/${user.avatarUrl}.png`} alt="" />
              <span>{user.username}</span>
              <button onClick={() => sendInvite(user.userId)}>
                Invite
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="invited-players">
        <h4>Invited Players ({invites.length})</h4>
        {invites.map(invite => (
          <div key={invite.inviteId} className="invited-player">
            <img src={`/avatars/${invite.recipient.avatar_url}.png`} alt="" />
            <span>{invite.recipient.username}</span>
            <span className={`status status-${invite.status}`}>
              {invite.status}
            </span>
            {invite.recipient.status && (
              <span className="online-status">{invite.recipient.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MatchInviteManager;
```

---

## Service Layer Functions

### `createInvite(matchId, senderId, recipientId)`

Creates a new match invitation with validation.

```javascript
const invite = await createInvite(1, 2, 3);
// Returns: transformed invite object with match, sender, recipient details
```

**Validation:**
- Match must exist and be in "scheduled" status
- Recipient cannot have pending invite for this match
- Recipient cannot already be in the match
- Recipient user must exist

**Throws:**
- `Error("Match not found")`
- `Error("Cannot invite to a match that has already started or finished")`
- `Error("User already has a pending invite for this match")`
- `Error("User is already in this match")`
- `Error("Recipient user not found")`

---

### `getReceivedInvites(userId, status?)`

Get invitations received by a user.

```javascript
const invites = await getReceivedInvites(3, 'pending');
// Returns: array of invite objects with match and sender details
```

**Parameters:**
- `userId` - ID of recipient
- `status` - Optional filter: 'pending', 'accepted', 'declined'

---

### `getSentInvites(userId, status?)`

Get invitations sent by a user.

```javascript
const invites = await getSentInvites(2, 'pending');
// Returns: array of invite objects with match and recipient details
```

---

### `getMatchInvites(matchId, requestingUserId)`

Get all invites for a match (host only).

```javascript
const invites = await getMatchInvites(1, 1);
// Returns: array of invite objects
```

**Throws:**
- `Error("Match not found")`
- `Error("You are not authorized to view invites for this match")`

---

### `acceptInvite(inviteId, userId)`

Accept an invitation and join the match.

```javascript
const result = await acceptInvite(1, 3);
// Returns: { invite, matchPlayer }
```

**Atomic Transaction:**
- Updates invite status to 'accepted'
- Adds user to match_players table
- Both succeed or both fail

**Throws:**
- `Error("Invite not found")`
- `Error("You are not authorized to accept this invite")`
- `Error("This invite has already been responded to")`
- `Error("Cannot accept invite for a match that has already started or finished")`

---

### `declineInvite(inviteId, userId)`

Decline an invitation.

```javascript
const invite = await declineInvite(1, 3);
// Returns: updated invite object
```

**Throws:** Same as acceptInvite

---

### `cancelInvite(inviteId, userId)`

Cancel a pending invitation (sender only).

```javascript
await cancelInvite(1, 2);
// Returns: void (deletes invite)
```

**Throws:**
- `Error("Invite not found")`
- `Error("Only the sender can cancel this invite")`
- `Error("Cannot cancel an invite that has already been responded to")`

---

## Database Schema

### Match Invites Table

```sql
match_invites (
  invite_id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
)
```

**Status Values:** `pending`, `accepted`, `declined`

**Constraints:**
- `match_id` must exist in matches table
- `sender_id` must exist in users table
- `recipient_id` must exist in users table
- Cascade delete when match or user is deleted

**Indexes:**
- Primary key on `invite_id`
- Index on `recipient_id` (for fast "received" queries)
- Index on `sender_id` (for fast "sent" queries)
- Index on `match_id` (for fast match invite queries)

---

## WebSocket Integration

### Real-time Notifications

The invitation system is designed to work with WebSocket for real-time notifications:

```javascript
// Server-side: Emit event when invite is sent
socket.to(`user:${recipientId}`).emit('invite:received', {
  inviteId: invite.inviteId,
  matchId: invite.matchId,
  sender: invite.sender
});

// Client-side: Listen for invite notifications
socket.on('invite:received', (data) => {
  showNotification(`${data.sender.username} invited you to a match!`);
  refreshInvites(); // Re-fetch invites list
});
```

### Recommended WebSocket Events

```javascript
// Invite sent
socket.emit('invite:sent', { inviteId, recipientId, matchId });

// Invite received
socket.on('invite:received', (data) => { /* ... */ });

// Invite accepted
socket.emit('invite:accepted', { inviteId, matchId });
socket.on('invite:accepted', (data) => { /* ... */ });

// Invite declined
socket.emit('invite:declined', { inviteId });
socket.on('invite:declined', (data) => { /* ... */ });

// Invite cancelled
socket.emit('invite:cancelled', { inviteId });
socket.on('invite:cancelled', (data) => { /* ... */ });
```

---

## Error Handling

### Error Response Format

```json
{
  "ok": false,
  "error": "Error message"
}
```

### Common Errors

| Status | Error | Scenario |
|--------|-------|----------|
| 400 | matchId, recipientId, and senderId are required | Missing fields |
| 400 | Cannot invite yourself | senderId === recipientId |
| 400 | User already has a pending invite for this match | Duplicate invite |
| 400 | User is already in this match | Recipient already joined |
| 400 | Cannot invite to a match that has already started | Match in progress |
| 400 | You are not authorized to accept this invite | Wrong recipient |
| 400 | This invite has already been responded to | Invite not pending |
| 400 | Cannot cancel an invite that has already been responded to | Trying to cancel accepted/declined |
| 400 | Only the sender can cancel this invite | Wrong user canceling |
| 403 | You are not authorized to view invites for this match | Not match host |
| 404 | Invite not found | Invalid invite ID |

---

## Testing

### Manual Testing with cURL

**Send invitation:**
```bash
curl -X POST http://localhost:3000/api/invites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "matchId": 1,
    "senderId": 2,
    "recipientId": 3
  }'
```

**Get received invitations:**
```bash
curl "http://localhost:3000/api/invites/received?userId=3&status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get sent invitations:**
```bash
curl "http://localhost:3000/api/invites/sent?userId=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get match invitations (host):**
```bash
curl "http://localhost:3000/api/invites/match/1?userId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Accept invitation:**
```bash
curl -X PUT http://localhost:3000/api/invites/1/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "userId": 3 }'
```

**Decline invitation:**
```bash
curl -X PUT http://localhost:3000/api/invites/1/decline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "userId": 3 }'
```

**Cancel invitation:**
```bash
curl -X DELETE "http://localhost:3000/api/invites/1?userId=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Best Practices

### Frontend

**Show pending count** - Badge on navigation for pending invites  
**Real-time updates** - Use WebSocket to refresh on new invites  
**Confirmation dialogs** - Confirm before accepting/declining  
**Disable after action** - Prevent duplicate accepts/declines  
**Show invite context** - Display match details in invitation  
**Filter by status** - Separate tabs for pending/accepted/declined  

### Backend

**Atomic operations** - Use transactions for accept (invite + player)  
**Cascade deletes** - Clean up invites when match/user deleted  
**Validation first** - Check all conditions before database writes  
**Authorization checks** - Verify user can perform action  
**Descriptive errors** - Clear messages for each failure case  

---

## Known Issues & Limitations

### Current Limitations

1. **No email notifications** - Invites only visible in-app (bonus feature)
2. **No browser notifications** - No push notifications (bonus feature)
3. **No bulk invites** - Can only invite one user at a time
4. **No invite expiry** - Invites remain pending indefinitely
5. **No invite message** - Can't add personal message to invite
6. **No re-invite** - Must wait for decline/cancel before re-inviting

### Future Enhancements

- Email notifications for invites
- Browser push notifications
- Bulk invite functionality
- Invite expiry (auto-cancel after X hours)
- Personal message with invites
- Invite templates
- Block list (prevent certain users from inviting you)
- Auto-accept from friends

---

## Performance Considerations

### Database Queries

✅ **Indexed columns** - recipient_id, sender_id, match_id all indexed  
✅ **Selective includes** - Only fetch needed user/match fields  
✅ **Ordered results** - Sorting done in database, not application  

⚠️ **Watch Out:**
- Recipient/sender queries can be slow with many invites (add pagination)
- Match invite query loads all players (fine for small matches)

### Optimization Recommendations

```javascript
// Add pagination for large result sets
export async function getReceivedInvites(userId, status, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const invites = await prisma.match_invites.findMany({
    where: { recipient_id: userId, status },
    take: limit,
    skip: skip,
    orderBy: { sent_at: 'desc' }
  });
  
  return invites;
}
```

---

## Contact & Maintenance

This invitation system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/invite/routes.js` - Route definitions
- `server/src/invite/controller.js` - HTTP request handlers
- `server/src/invite/service.js` - Business logic and database queries

**Dependencies:**
- `@prisma/client` - Database ORM
- `express` - Web framework

**Last Updated:** 15 October 2025
