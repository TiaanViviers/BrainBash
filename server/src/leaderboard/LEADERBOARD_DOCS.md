# Leaderboard System Documentation

## Overview

The leaderboard system provides ranked player statistics and competitive rankings across different time periods and categories. It aggregates player performance data to create dynamic leaderboards with multiple ranking metrics, supporting filters by time period (daily, weekly, all-time) and trivia categories.

### Key Features

- **Multiple Time Periods** - Daily, weekly, and all-time rankings
- **Category Filtering** - Filter leaderboards by trivia category
- **Pagination Support** - Handle large datasets efficiently
- **User Context View** - Show players above and below a specific user
- **Multiple Ranking Metrics** - Total score, win rate, accuracy, response time
- **Real-time Updates** - Designed to reflect latest match results
- **Public Access** - No authentication required for viewing leaderboards

---

## Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ HTTP Requests
       ↓
┌──────────────────┐
│Leaderboard Routes│  ← /api/leaderboard
│  (routes.js)     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│Leaderboard Ctrl  │  ← HTTP handlers
│ (controller.js)  │     Input validation
└────────┬─────────┘     Response formatting
         ↓
┌──────────────────┐
│Leaderboard Svc   │  ← Business logic
│  (service.js)    │     Aggregations
└────────┬─────────┘     Complex queries
         ↓
┌──────────────────┐
│  Prisma ORM      │  ← Database access
│  (PostgreSQL)    │
└──────────────────┘
```

---

## API Endpoints

### 1. Get Leaderboard

**Endpoint:** `GET /api/leaderboard`  
**Authentication:** Not required (public)  
**Description:** Get ranked players with optional filters.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | "all" | Time period: `daily`, `weekly`, `all` |
| category | string | No | - | Filter by category name (e.g., "Science") |
| limit | integer | No | 100 | Number of results (1-500) |
| page | integer | No | 1 | Page number for pagination |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": 5,
      "username": "trivia_master",
      "avatar": "bubbles",
      "totalScore": 45000,
      "gamesPlayed": 120,
      "gamesWon": 85,
      "averageScore": 375,
      "highestScore": 950,
      "correctAnswers": 890,
      "totalAnswers": 1200,
      "accuracy": 74,
      "averageResponseTime": 2.5,
      "bestCategory": "Science",
      "memberSince": "2025-09-01T10:00:00.000Z"
    },
    {
      "rank": 2,
      "userId": 12,
      "username": "quiz_whiz",
      "avatar": "stewie",
      "totalScore": 42000,
      "gamesPlayed": 110,
      "gamesWon": 75,
      "averageScore": 382,
      "highestScore": 980,
      "correctAnswers": 850,
      "totalAnswers": 1100,
      "accuracy": 77,
      "averageResponseTime": 2.3,
      "bestCategory": "History",
      "memberSince": "2025-08-15T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 342,
    "totalPages": 4
  },
  "period": "all",
  "category": null
}
```

#### Error Responses

**400 Bad Request** - Invalid period
```json
{
  "ok": false,
  "error": "Invalid period. Must be one of: daily, weekly, all"
}
```

**400 Bad Request** - Invalid limit
```json
{
  "ok": false,
  "error": "Limit must be between 1 and 500"
}
```

**404 Not Found** - Invalid category
```json
{
  "ok": false,
  "error": "Category 'InvalidCategory' not found"
}
```

#### Ranking Logic

**Primary Sort:** Total score (descending)  
**Tiebreaker 1:** Games won (descending)  
**Tiebreaker 2:** Average response time (ascending - faster is better)

#### Usage Examples

```bash
# All-time global leaderboard
GET /api/leaderboard

# Weekly leaderboard for Science category
GET /api/leaderboard?period=weekly&category=Science

# Top 50 daily players, page 1
GET /api/leaderboard?period=daily&limit=50&page=1

# Second page of all-time leaderboard
GET /api/leaderboard?limit=100&page=2
```

---

### 2. Get My Rank

**Endpoint:** `GET /api/leaderboard/me`  
**Authentication:** Required (Bearer token)  
**Description:** Get current user's rank and statistics.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | "all" | Time period: `daily`, `weekly`, `all` |
| category | string | No | - | Filter by category name |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "rank": 42,
  "stats": {
    "userId": 3,
    "username": "current_user",
    "avatar": "homer",
    "totalScore": 12500,
    "gamesPlayed": 45,
    "gamesWon": 28,
    "averageScore": 278,
    "highestScore": 880,
    "correctAnswers": 350,
    "totalAnswers": 450,
    "accuracy": 78,
    "averageResponseTime": 3.2,
    "bestCategory": "Geography",
    "memberSince": "2025-10-01T12:00:00.000Z"
  },
  "total": 342,
  "period": "all",
  "category": null
}
```

#### Error Responses

**401 Unauthorized** - Not authenticated
```json
{
  "ok": false,
  "error": "Authentication required"
}
```

**404 Not Found** - User not in leaderboard
```json
{
  "ok": false,
  "error": "User not found"
}
```

#### Usage Notes
- Requires authentication middleware (TODO: implement)
- Returns user's global rank and detailed stats
- Useful for profile page "Your Rank" widget

---

### 3. Get User Leaderboard Context

**Endpoint:** `GET /api/leaderboard/user/:userId`  
**Authentication:** Not required (public)  
**Description:** Get a user's rank with players above and below for context.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | integer | Yes | User ID to get context for |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | "all" | Time period: `daily`, `weekly`, `all` |
| category | string | No | - | Filter by category name |
| context | integer | No | 5 | Number of players above/below to show (1-50) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "user": {
    "rank": 42,
    "userId": 3,
    "username": "target_user",
    "avatar": "homer",
    "totalScore": 12500,
    "gamesPlayed": 45,
    "gamesWon": 28,
    "averageScore": 278,
    "highestScore": 880,
    "correctAnswers": 350,
    "totalAnswers": 450,
    "accuracy": 78,
    "averageResponseTime": 3.2,
    "bestCategory": "Geography",
    "memberSince": "2025-10-01T12:00:00.000Z"
  },
  "playersAbove": [
    {
      "rank": 37,
      "userId": 15,
      "username": "player_above_5",
      "avatar": "bubbles",
      "totalScore": 13200,
      "gamesPlayed": 50,
      "gamesWon": 32,
      "averageScore": 264
    },
    {
      "rank": 38,
      "userId": 22,
      "username": "player_above_4",
      "avatar": "stewie",
      "totalScore": 13100,
      "gamesPlayed": 48,
      "gamesWon": 30,
      "averageScore": 273
    }
    // ... 3 more players
  ],
  "playersBelow": [
    {
      "rank": 43,
      "userId": 8,
      "username": "player_below_1",
      "avatar": "clarence",
      "totalScore": 12400,
      "gamesPlayed": 44,
      "gamesWon": 27,
      "averageScore": 282
    }
    // ... 4 more players
  ],
  "period": "all",
  "category": null
}
```

#### Error Responses

**400 Bad Request** - Invalid userId
```json
{
  "ok": false,
  "error": "Invalid user ID"
}
```

**400 Bad Request** - Invalid context
```json
{
  "ok": false,
  "error": "Context must be between 1 and 50"
}
```

**404 Not Found** - User doesn't exist
```json
{
  "ok": false,
  "error": "User not found"
}
```

#### Usage Notes
- Shows competitive context around a specific player
- Useful for "Compare with Friends" features
- Default context of 5 shows 5 players above and 5 below
- Public endpoint (no auth required)

---

## Frontend Integration

### Global Leaderboard Component

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('all');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, category, page]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = {
        period,
        limit: 50,
        page
      };
      if (category) params.category = category;

      const { data } = await api.get('/leaderboard', { params });
      setLeaderboard(data.leaderboard);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  if (loading) return <div>Loading leaderboard...</div>;

  return (
    <div className="leaderboard">
      <h1>🏆 Leaderboard</h1>
      
      <div className="filters">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">All Time</option>
          <option value="weekly">This Week</option>
          <option value="daily">Today</option>
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Science">Science</option>
          <option value="History">History</option>
          <option value="Geography">Geography</option>
          <option value="Entertainment">Entertainment</option>
          {/* Add more categories */}
        </select>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((player) => (
          <div key={player.userId} className={`player-card ${getRankClass(player.rank)}`}>
            <div className="rank">#{player.rank}</div>
            <img src={`/avatars/${player.avatar}.png`} alt={player.username} />
            <div className="player-info">
              <h3>{player.username}</h3>
              <div className="stats">
                <span>🏆 {player.totalScore.toLocaleString()} pts</span>
                <span>🎯 {player.accuracy}% accuracy</span>
                <span>🎮 {player.gamesWon}/{player.gamesPlayed} wins</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && (
        <div className="pagination">
          <button 
            onClick={() => setPage(page - 1)} 
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {pagination.totalPages}</span>
          <button 
            onClick={() => setPage(page + 1)} 
            disabled={page === pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
```

---

### User Rank Widget (Profile Page)

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import { useAuth } from './AuthContext';

function MyRankWidget() {
  const { user } = useAuth();
  const [rankData, setRankData] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyRank();
    }
  }, [user, period]);

  const fetchMyRank = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/leaderboard/me', {
        params: { period }
      });
      setRankData(data);
    } catch (err) {
      console.error('Failed to load rank:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading your rank...</div>;
  if (!rankData) return null;

  const percentile = ((rankData.total - rankData.rank) / rankData.total * 100).toFixed(1);

  return (
    <div className="my-rank-widget">
      <h3>Your Ranking</h3>
      
      <div className="period-selector">
        <button 
          className={period === 'all' ? 'active' : ''}
          onClick={() => setPeriod('all')}
        >
          All Time
        </button>
        <button 
          className={period === 'weekly' ? 'active' : ''}
          onClick={() => setPeriod('weekly')}
        >
          This Week
        </button>
        <button 
          className={period === 'daily' ? 'active' : ''}
          onClick={() => setPeriod('daily')}
        >
          Today
        </button>
      </div>

      <div className="rank-display">
        <div className="rank-number">#{rankData.rank}</div>
        <div className="rank-context">
          out of {rankData.total.toLocaleString()} players
        </div>
        <div className="percentile">
          Top {percentile}%
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span className="label">Total Score</span>
          <span className="value">{rankData.stats.totalScore.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="label">Accuracy</span>
          <span className="value">{rankData.stats.accuracy}%</span>
        </div>
        <div className="stat">
          <span className="label">Win Rate</span>
          <span className="value">
            {((rankData.stats.gamesWon / rankData.stats.gamesPlayed) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="stat">
          <span className="label">Best Category</span>
          <span className="value">{rankData.stats.bestCategory}</span>
        </div>
      </div>
    </div>
  );
}

export default MyRankWidget;
```

---

### Leaderboard Context View (Compare with Player)

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function PlayerComparison({ targetUserId }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContext();
  }, [targetUserId]);

  const fetchContext = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/leaderboard/user/${targetUserId}`, {
        params: { context: 3 } // 3 above, 3 below
      });
      setContext(data);
    } catch (err) {
      console.error('Failed to load context:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!context) return null;

  return (
    <div className="player-context">
      <h3>Leaderboard Position</h3>
      
      {/* Players above */}
      <div className="players-above">
        {context.playersAbove.map((player) => (
          <div key={player.userId} className="player-row">
            <span className="rank">#{player.rank}</span>
            <img src={`/avatars/${player.avatar}.png`} alt="" />
            <span className="username">{player.username}</span>
            <span className="score">{player.totalScore.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Target user */}
      <div className="player-row target-user">
        <span className="rank">#{context.user.rank}</span>
        <img src={`/avatars/${context.user.avatar}.png`} alt="" />
        <span className="username">{context.user.username}</span>
        <span className="score">{context.user.totalScore.toLocaleString()}</span>
      </div>

      {/* Players below */}
      <div className="players-below">
        {context.playersBelow.map((player) => (
          <div key={player.userId} className="player-row">
            <span className="rank">#{player.rank}</span>
            <img src={`/avatars/${player.avatar}.png`} alt="" />
            <span className="username">{player.username}</span>
            <span className="score">{player.totalScore.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayerComparison;
```

---

### Top Players Widget (Homepage)

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function TopPlayersWidget() {
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPlayers();
  }, []);

  const fetchTopPlayers = async () => {
    try {
      const { data } = await api.get('/leaderboard', {
        params: { limit: 10 }
      });
      setTopPlayers(data.leaderboard);
    } catch (err) {
      console.error('Failed to load top players:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="top-players-widget">
      <h3>🏆 Top Players</h3>
      <div className="players-list">
        {topPlayers.map((player) => (
          <div key={player.userId} className="mini-player-card">
            <span className="rank">{getMedalEmoji(player.rank)}</span>
            <img src={`/avatars/${player.avatar}.png`} alt="" />
            <span className="username">{player.username}</span>
            <span className="score">{player.totalScore.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopPlayersWidget;
```

---

## Service Layer Functions

### `getLeaderboard({ period, category, limit, page })`

Get paginated leaderboard with filters.

```javascript
const result = await getLeaderboard({
  period: 'weekly',
  category: 'Science',
  limit: 50,
  page: 1
});
// Returns: { players: Array, total: number }
```

**Period Options:**
- `'daily'` - Last 24 hours
- `'weekly'` - Last 7 days
- `'all'` - All-time (from user_stats table)

**Throws:** `Error("Category 'X' not found")` if invalid category

---

### `getUserRank({ userId, period, category })`

Get a user's rank and statistics.

```javascript
const result = await getUserRank({
  userId: 3,
  period: 'all',
  category: 'Science'
});
// Returns: { rank: number, stats: Object, total: number }
```

**Throws:** `Error("User not found in leaderboard")` if user has no stats

---

### `getUserLeaderboardContext({ userId, period, category, context })`

Get players above and below a user.

```javascript
const result = await getUserLeaderboardContext({
  userId: 3,
  period: 'all',
  context: 5
});
// Returns: { user: Object, playersAbove: Array, playersBelow: Array }
```

**Throws:** `Error("User not found")` if user doesn't exist

---

### Utility Functions

#### `getTopPlayers(limit = 10)`

Get top N players (all-time).

```javascript
const topPlayers = await getTopPlayers(10);
// Returns: Array of top 10 players with ranks
```

#### `getCategoryLeaderboards(limit = 10)`

Get leaderboards for all categories at once.

```javascript
const leaderboards = await getCategoryLeaderboards(10);
// Returns: { "Science": [...], "History": [...], ... }
```

---

## Database Schema

### User Stats Table (All-Time Data)

```sql
user_stats (
  stat_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(10, 2) DEFAULT 0.0,
  highest_score INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  avg_response_time DECIMAL(10, 2) DEFAULT 0.0,
  best_category INTEGER REFERENCES categories(category_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Scores Table (Match-Specific Data)

```sql
scores (
  score_id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  avg_response_time DECIMAL(10, 2) DEFAULT 0.0
)
```

### Indexes (Performance Critical)

```sql
CREATE INDEX idx_user_stats_total_score ON user_stats(total_score DESC);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_scores_match_id ON scores(match_id);
CREATE INDEX idx_scores_user_id ON scores(user_id);
```

---

## Ranking Algorithms

### All-Time Ranking

**Source:** `user_stats` table (pre-aggregated)

**Sort Order:**
1. Total score (descending)
2. Games won (descending)
3. Average response time (ascending)

**Pros:** Fast queries, simple aggregation  
**Cons:** Doesn't reflect recent performance

---

### Weekly/Daily Ranking

**Source:** `scores` table + `matches` table (dynamic aggregation)

**Process:**
1. Filter matches by `end_time` (last 7 days or 24 hours)
2. Filter by `status = 'completed'`
3. Optionally filter by category (via `match_rounds`)
4. Aggregate scores per user
5. Sort by total score, games won, response time

**Pros:** Reflects recent performance  
**Cons:** Expensive queries (optimize with caching)

---

## Performance Considerations

### Current Implementation

⚠️ **Expensive Operations:**
- Weekly/daily leaderboards aggregate on every request
- User rank queries load entire leaderboard (up to 10,000 records)
- Category filtering requires joins through match_rounds

✅ **Optimized:**
- All-time leaderboard uses pre-aggregated user_stats
- Pagination limits result set size
- Database indexes on score columns

---

### Recommended Optimizations

#### 1. Redis Caching

```javascript
import Redis from 'ioredis';
const redis = new Redis();

export async function getLeaderboard({ period, category, limit, page }) {
  const cacheKey = `leaderboard:${period}:${category || 'all'}:${page}:${limit}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query database
  const result = await getLeaderboardFromDB({ period, category, limit, page });
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result));
  
  return result;
}
```

#### 2. Materialized Views (PostgreSQL)

```sql
-- Pre-compute weekly leaderboard
CREATE MATERIALIZED VIEW weekly_leaderboard AS
SELECT 
  user_id,
  SUM(total_score) as total_score,
  COUNT(*) as games_played,
  AVG(avg_response_time) as avg_response_time
FROM scores s
JOIN matches m ON s.match_id = m.match_id
WHERE m.end_time >= NOW() - INTERVAL '7 days'
  AND m.status = 'completed'
GROUP BY user_id
ORDER BY total_score DESC;

-- Refresh every hour
REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_leaderboard;
```

#### 3. Batch User Rank Lookups

```javascript
// Instead of loading all 10,000 records
// Use SQL window functions
const getUserRankQuery = `
  SELECT 
    rank,
    user_id,
    username,
    total_score
  FROM (
    SELECT 
      *,
      ROW_NUMBER() OVER (ORDER BY total_score DESC, games_won DESC) as rank
    FROM user_stats
    JOIN users USING (user_id)
  ) ranked
  WHERE user_id = $1
`;
```

---

## Testing

### Manual Testing with cURL

**Get all-time leaderboard:**
```bash
curl http://localhost:3000/api/leaderboard
```

**Get weekly Science leaderboard:**
```bash
curl "http://localhost:3000/api/leaderboard?period=weekly&category=Science&limit=50"
```

**Get my rank:**
```bash
curl http://localhost:3000/api/leaderboard/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get user context:**
```bash
curl "http://localhost:3000/api/leaderboard/user/3?context=5"
```

---

## Best Practices

### Frontend

✅ **Cache leaderboard data** - Refresh every 30-60 seconds  
✅ **Show loading states** - Leaderboard queries can be slow  
✅ **Highlight current user** - If they appear in the list  
✅ **Use pagination** - Don't load thousands of players at once  
✅ **Show rank badges** - Gold/silver/bronze for top 3  
✅ **Add filters prominently** - Period and category selectors  

### Backend

✅ **Add database indexes** - On score columns and foreign keys  
✅ **Implement caching** - Redis for frequently accessed leaderboards  
✅ **Limit result sets** - Max 500 players per query  
✅ **Use pagination** - Don't return entire leaderboard  
✅ **Consider materialized views** - For weekly/daily leaderboards  
✅ **Monitor query performance** - Log slow queries  

---

## Known Issues & Limitations

### Current Limitations

1. **Expensive user rank queries** - Loads entire leaderboard to find position
2. **No caching** - Every request hits database
3. **No tie-breaking on equal scores** - Multiple users can have same rank
4. **Category filtering is slow** - Requires join through match_rounds
5. **No historical tracking** - Can't see "rank yesterday" or trends
6. **No friends leaderboard** - Can't filter to show only friends

### Future Enhancements

- Redis caching layer
- PostgreSQL materialized views
- Rank history tracking (daily snapshots)
- Friends-only leaderboard
- Category-specific achievements
- Seasonal leaderboards (monthly resets)
- Global vs regional leaderboards
- Team/clan leaderboards

---

## Error Handling

### Error Response Format

```json
{
  "ok": false,
  "error": "Error message",
  "message": "Detailed error message"
}
```

### Common Errors

| Status | Error | Scenario |
|--------|-------|----------|
| 400 | Invalid period. Must be one of: daily, weekly, all | Invalid period parameter |
| 400 | Limit must be between 1 and 500 | Limit out of range |
| 400 | Invalid page number | Page < 1 |
| 400 | Invalid user ID | Non-numeric userId |
| 400 | Context must be between 1 and 50 | Context out of range |
| 401 | Authentication required | /me endpoint without auth |
| 404 | Category 'X' not found | Invalid category name |
| 404 | User not found | User doesn't exist |
| 500 | Failed to fetch leaderboard | Database error |

---

## Contact & Maintenance

This leaderboard system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/leaderboard/routes.js` - Route definitions
- `server/src/leaderboard/controller.js` - HTTP request handlers
- `server/src/leaderboard/service.js` - Business logic and complex aggregations

**Dependencies:**
- `@prisma/client` - Database ORM
- `express` - Web framework

**Performance Notes:**
- Consider adding Redis caching before production
- Monitor query performance on weekly/daily endpoints
- Add database indexes on score columns

**Last Updated:** 15 October 2025
