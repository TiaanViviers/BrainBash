# Match System Documentation

## Overview

The match system is the core gameplay engine for the trivia tournament. It manages match creation, real-time question progression, answer submission with time-based scoring, and final scoreboard calculations. All match state is fully persisted in the PostgreSQL database via Prisma ORM, ensuring reliability and enabling match history tracking.

### Key Features

- **Match Creation** - Create multiplayer trivia matches with custom settings
- **Database Persistence** - All state stored in PostgreSQL (no in-memory storage)
- **Time-Based Scoring** - Dynamic point calculation based on response speed
- **Real-time Gameplay** - Designed for WebSocket integration
- **Tie-Breaking Logic** - Score → Correct answers → Response time
- **Statistics Tracking** - Comprehensive player stats and match history
- **Multi-Player Support** - Handle 1+ players per match
- **Question Shuffling** - Randomized answer options per match
- **Match Status** - ONGOING → FINISHED state tracking

---

## Architecture

```
┌─────────────┐
│   Client    │
│  (React +   │
│  WebSocket) │
└──────┬──────┘
       │ HTTP + WS
       ↓
┌──────────────────┐
│  Match Routes    │  ← /api/match
│  (routes.js)     │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Match Controller │  ← HTTP handlers
│ (controller.js)  │     Input validation
└────────┬─────────┘     Response formatting
         ↓
┌──────────────────┐
│ Match Service    │  ← Business logic
│  (service.js)    │     Scoring algorithm
└────────┬─────────┘     State management
         ↓
┌──────────────────┐
│  Prisma ORM      │  ← Database access
│  (PostgreSQL)    │
└──────────────────┘

Integration:
┌──────────────────┐
│ Question Service │  ← Fetch random questions
└──────────────────┘
```

---

## API Endpoints

### 1. Create Match

**Endpoint:** `POST /api/match`  
**Authentication:** Required (player must be authenticated)  
**Description:** Create a new trivia match with specified parameters.

#### Request Body

```json
{
  "category": "Science",
  "difficulty": "medium",
  "amount": 10,
  "players": [1, 2, 3],
  "hostId": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Yes | Category name (must exist in database) |
| difficulty | string | Yes | Difficulty level: `easy`, `medium`, `hard` |
| amount | integer | No | Number of questions (1-50, default: 10) |
| players | integer[] | Yes | Array of user IDs (at least 1 player) |
| hostId | integer | No | Host user ID (defaults to first player) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "matchId": 42,
  "totalQuestions": 10
}
```

#### Error Responses

**400 Bad Request** - Missing category
```json
{
  "ok": false,
  "error": "Category is required"
}
```

**400 Bad Request** - Invalid difficulty
```json
{
  "ok": false,
  "error": "Valid difficulty is required (easy, medium, hard)"
}
```

**400 Bad Request** - No players
```json
{
  "ok": false,
  "error": "At least one player ID required"
}
```

**400 Bad Request** - Invalid player IDs
```json
{
  "ok": false,
  "error": "All player IDs must be positive integers"
}
```

**400 Bad Request** - Invalid amount
```json
{
  "ok": false,
  "error": "Amount must be between 1 and 50"
}
```

**400 Bad Request** - No questions available
```json
{
  "ok": false,
  "error": "No questions available for Science at medium difficulty"
}
```

**400 Bad Request** - Invalid player
```json
{
  "ok": false,
  "error": "One or more invalid player IDs"
}
```

#### What Happens on Creation

1. **Validates all player IDs exist** in database
2. **Fetches random questions** from question service
3. **Creates database records** in a transaction:
   - Match record (status: ONGOING)
   - Single round record
   - Match questions (with shuffled options)
   - Match players (all with score: 0)
4. **Returns match ID** and question count

#### Usage Notes
- All questions are fetched and stored upfront (no lazy loading)
- Answer options are shuffled per match (not per player)
- Correct answer is stored as the actual option text
- Match starts immediately (status: ONGOING)

---

### 2. Get Match State

**Endpoint:** `GET /api/match/:id/state`  
**Authentication:** Not required (public for spectators)  
**Description:** Get current match state including current question and player scores.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Match ID |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "matchId": 42,
  "status": "ONGOING",
  "index": 3,
  "total": 10,
  "finished": false,
  "question": {
    "id": 125,
    "number": 4,
    "text": "What is the chemical symbol for Gold?",
    "options": [
      "Au",
      "Ag",
      "Fe",
      "Pb"
    ]
  },
  "players": [
    {
      "userId": 1,
      "username": "player1",
      "score": 280
    },
    {
      "userId": 2,
      "username": "player2",
      "score": 265
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| matchId | integer | Match ID |
| status | string | Match status: `ONGOING`, `FINISHED` |
| index | integer | Current question index (0-based) |
| total | integer | Total number of questions |
| finished | boolean | Whether match is complete |
| question | object | Current question (null if finished) |
| question.id | integer | Match question ID (for answer submission) |
| question.number | integer | Question number (1-based) |
| question.text | string | Question text |
| question.options | string[] | Four answer options (shuffled) |
| players | array | All players with current scores |

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid match ID"
}
```

**404 Not Found** - Match doesn't exist
```json
{
  "ok": false,
  "error": "Match not found"
}
```

#### Security Note
- **Does NOT reveal correct answer** (hidden until after submission)
- Public endpoint (allows spectators)
- Question options are already shuffled in database

---

### 3. Submit Answer

**Endpoint:** `POST /api/match/:id/answer`  
**Authentication:** Required (must be player in match)  
**Description:** Submit an answer for the current question with response time.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Match ID |

#### Request Body

```json
{
  "userId": 1,
  "matchQuestionId": 125,
  "selectedOption": "Au",
  "responseTimeMs": 3450
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | integer | Yes | User ID submitting answer |
| matchQuestionId | integer | Yes | Match question ID (from state endpoint) |
| selectedOption | string | Yes | The exact option text selected |
| responseTimeMs | integer | No | Response time in milliseconds (for scoring) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "accepted": true,
  "isCorrect": true,
  "correctAnswer": "Au",
  "pointsAwarded": 87,
  "responseTime": 3450
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| accepted | boolean | Whether answer was accepted |
| isCorrect | boolean | Whether answer was correct |
| correctAnswer | string | The correct answer (always revealed after submission) |
| pointsAwarded | integer | Points earned (0-100) |
| responseTime | integer | Response time used for scoring |

#### Already Answered Response

```json
{
  "ok": true,
  "accepted": false,
  "reason": "already-answered",
  "isCorrect": true
}
```

#### Error Responses

**400 Bad Request** - Invalid match ID
```json
{
  "ok": false,
  "error": "Invalid match ID"
}
```

**400 Bad Request** - Missing userId
```json
{
  "ok": false,
  "error": "User ID is required"
}
```

**400 Bad Request** - Match finished
```json
{
  "ok": false,
  "error": "Match already finished"
}
```

**400 Bad Request** - Player not in match
```json
{
  "ok": false,
  "error": "Player not in this match"
}
```

**400 Bad Request** - Invalid question
```json
{
  "ok": false,
  "error": "Invalid question for this match"
}
```

#### Scoring Algorithm (Per Project Spec)

**Base Score:** 100 points for correct answer  
**Time Penalty:** -1 point per 100ms slower than fastest responder  
**Minimum:** 10 points (even if very slow)  
**Maximum:** 100 points

**Formula:**
```
points = 100 - floor((yourTime - fastestTime) / 100)
points = max(10, min(100, points))
```

**Example:**
- Player A answers in 2000ms: 100 points (fastest)
- Player B answers in 2500ms: 95 points (-5 for 500ms slower)
- Player C answers in 5000ms: 70 points (-30 for 3000ms slower)
- Player D answers in 15000ms: 10 points (minimum, very slow)

#### What Happens on Submission

1. **Validates** match exists, is ongoing, player is in match
2. **Checks** if player already answered this question
3. **Compares** selected option with correct answer
4. **Calculates points** using time-based scoring algorithm
5. **Saves** answer to player_answers table
6. **Updates** player score in match_players table
7. **Returns** result with correct answer revealed

---

### 4. Advance to Next Question

**Endpoint:** `POST /api/match/:id/next`  
**Authentication:** Required (typically host only)  
**Description:** Move to the next question or finish the match.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Match ID |

#### Success Response (200 OK) - Next Question

```json
{
  "ok": true,
  "index": 4,
  "finished": false,
  "status": "ONGOING"
}
```

#### Success Response (200 OK) - Match Finished

```json
{
  "ok": true,
  "index": 10,
  "finished": true,
  "status": "FINISHED"
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid match ID"
}
```

**400 Bad Request** - Match not found
```json
{
  "ok": false,
  "error": "Match not found"
}
```

#### Logic

- Determines current question based on answer completion
- If on last question → triggers `finishMatch()`
- Otherwise → returns next question index
- WebSocket should broadcast new state to all clients

#### When Match Finishes

Automatically triggers comprehensive end-of-match processing:
1. Updates match status to FINISHED
2. Calculates average response times per player
3. Determines winner(s) with tie-breaking
4. Creates scores records for match history
5. Updates user_stats for all players

---

### 5. Get Scoreboard

**Endpoint:** `GET /api/match/:id/scoreboard`  
**Authentication:** Not required (public)  
**Description:** Get current or final scoreboard for a match.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | Match ID |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "matchId": 42,
  "status": "FINISHED",
  "scores": [
    {
      "rank": 1,
      "userId": 1,
      "username": "player1",
      "avatar": "bubbles",
      "score": 847
    },
    {
      "rank": 2,
      "userId": 2,
      "username": "player2",
      "avatar": "homer",
      "score": 821
    },
    {
      "rank": 3,
      "userId": 3,
      "username": "player3",
      "avatar": "stewie",
      "score": 795
    }
  ],
  "finished": true,
  "currentQuestion": 10,
  "totalQuestions": 10
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid match ID"
}
```

**404 Not Found** - Match doesn't exist
```json
{
  "ok": false,
  "error": "Match not found"
}
```

#### Usage Notes
- Scores are sorted by rank (descending score)
- Can be called during match (shows current scores)
- After match finishes, shows final results
- Public endpoint (useful for match history pages)

---

## Frontend Integration

### Match Creation Flow

```jsx
import React, { useState } from 'react';
import api from './api';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function CreateMatchForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: 'Science',
    difficulty: 'medium',
    amount: 10,
    players: [user.userId] // Start with host
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/match', {
        ...formData,
        hostId: user.userId
      });

      // Navigate to match lobby
      navigate(`/match/${data.matchId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Match</h2>

      <select
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      >
        <option value="Science">Science</option>
        <option value="History">History</option>
        <option value="Geography">Geography</option>
        <option value="Entertainment">Entertainment</option>
      </select>

      <select
        value={formData.difficulty}
        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <input
        type="number"
        min="1"
        max="50"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Match'}
      </button>
    </form>
  );
}

export default CreateMatchForm;
```

---

### Match Gameplay Component (with WebSocket)

```jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from './api';
import { useAuth } from './AuthContext';
import useMatchSocket from './hooks/useMatchSocket';

function MatchPlay() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const [matchState, setMatchState] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [loading, setLoading] = useState(true);

  // WebSocket integration
  const { socket } = useMatchSocket(matchId);

  useEffect(() => {
    fetchMatchState();
  }, [matchId]);

  useEffect(() => {
    if (!socket) return;

    // Listen for match state updates
    socket.on('match:state', (state) => {
      setMatchState(state);
      setAnswered(false);
      setSelectedOption(null);
      setResult(null);
      setQuestionStartTime(Date.now());
    });

    // Listen for new questions
    socket.on('question:new', () => {
      fetchMatchState();
      setAnswered(false);
      setSelectedOption(null);
      setResult(null);
      setQuestionStartTime(Date.now());
    });

    // Listen for match finish
    socket.on('match:finished', () => {
      fetchMatchState();
    });

    return () => {
      socket.off('match:state');
      socket.off('question:new');
      socket.off('match:finished');
    };
  }, [socket]);

  const fetchMatchState = async () => {
    try {
      const { data } = await api.get(`/match/${matchId}/state`);
      setMatchState(data);
      setQuestionStartTime(Date.now());
    } catch (err) {
      console.error('Failed to load match state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || answered) return;

    const responseTimeMs = Date.now() - questionStartTime;

    try {
      const { data } = await api.post(`/match/${matchId}/answer`, {
        userId: user.userId,
        matchQuestionId: matchState.question.id,
        selectedOption,
        responseTimeMs
      });

      setResult(data);
      setAnswered(true);

      // Emit to WebSocket for real-time updates
      socket.emit('answer:submitted', {
        userId: user.userId,
        isCorrect: data.isCorrect,
        pointsAwarded: data.pointsAwarded
      });
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  if (loading) return <div>Loading match...</div>;
  if (!matchState) return <div>Match not found</div>;

  if (matchState.finished) {
    return <MatchScoreboard matchId={matchId} />;
  }

  return (
    <div className="match-play">
      <div className="match-header">
        <h2>Question {matchState.index + 1} of {matchState.total}</h2>
        <div className="players">
          {matchState.players.map(p => (
            <div key={p.userId} className="player-score">
              <span>{p.username}</span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="question">
        <h3>{matchState.question.text}</h3>
      </div>

      <div className="options">
        {matchState.question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => setSelectedOption(option)}
            disabled={answered}
            className={`option ${selectedOption === option ? 'selected' : ''} ${
              answered && result?.correctAnswer === option ? 'correct' : ''
            } ${
              answered && selectedOption === option && !result?.isCorrect ? 'wrong' : ''
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {!answered && (
        <button
          onClick={handleSubmitAnswer}
          disabled={!selectedOption}
          className="submit-button"
        >
          Submit Answer
        </button>
      )}

      {answered && result && (
        <div className="result">
          <h3>{result.isCorrect ? '✅ Correct!' : '❌ Wrong!'}</h3>
          <p>Correct answer: {result.correctAnswer}</p>
          {result.isCorrect && (
            <p>Points earned: {result.pointsAwarded}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchPlay;
```

---

### Scoreboard Component

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function MatchScoreboard({ matchId }) {
  const [scoreboard, setScoreboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScoreboard();
  }, [matchId]);

  const fetchScoreboard = async () => {
    try {
      const { data } = await api.get(`/match/${matchId}/scoreboard`);
      setScoreboard(data);
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  if (loading) return <div>Loading scoreboard...</div>;
  if (!scoreboard) return <div>Scoreboard not available</div>;

  return (
    <div className="scoreboard">
      <h1>Match Complete!</h1>

      <div className="final-scores">
        {scoreboard.scores.map((player) => (
          <div key={player.userId} className={`score-row rank-${player.rank}`}>
            <span className="medal">{getMedalEmoji(player.rank)}</span>
            <span className="rank">#{player.rank}</span>
            <img src={`/avatars/${player.avatar}.png`} alt="" />
            <span className="username">{player.username}</span>
            <span className="score">{player.score} pts</span>
          </div>
        ))}
      </div>

      <div className="match-stats">
        <p>Questions: {scoreboard.currentQuestion}/{scoreboard.totalQuestions}</p>
        <p>Status: {scoreboard.status}</p>
      </div>
    </div>
  );
}

export default MatchScoreboard;
```

---

## Service Layer Functions

### `createMatch({ category, difficulty, amount, players, hostId })`

Creates a new match with all questions pre-loaded.

```javascript
const result = await createMatch({
  category: 'Science',
  difficulty: 'medium',
  amount: 10,
  players: [1, 2, 3],
  hostId: 1
});
// Returns: { matchId: 42, totalQuestions: 10 }
```

**Transaction Scope:**
1. Creates match record
2. Creates round record
3. Creates match_questions (with shuffled options)
4. Creates match_players (initial score: 0)

**Throws:**
- `Error("At least one player required")`
- `Error("One or more invalid player IDs")`
- `Error("No questions available for {category} at {difficulty} difficulty")`

---

### `getPublicState(matchId)`

Get current match state without revealing correct answer.

```javascript
const state = await getPublicState(42);
// Returns: { matchId, status, index, total, finished, question, players }
```

**Features:**
- Hides correct answer (security)
- Shows current question index
- Shows all player scores
- Indicates if match finished

---

### `submitAnswer(matchId, { userId, matchQuestionId, selectedOption, responseTimeMs })`

Submit and score an answer.

```javascript
const result = await submitAnswer(42, {
  userId: 1,
  matchQuestionId: 125,
  selectedOption: "Au",
  responseTimeMs: 3450
});
// Returns: { accepted, isCorrect, correctAnswer, pointsAwarded, responseTime }
```

**Scoring Logic:**
1. Gets all correct answers for this question
2. Finds fastest response time
3. Calculates penalty: -1 per 100ms slower
4. Applies minimum (10) and maximum (100)
5. Updates player score if correct

**Throws:**
- `Error("Match not found")`
- `Error("Match already finished")`
- `Error("Player not in this match")`
- `Error("Invalid question for this match")`

---

### `nextQuestion(matchId)`

Advance to next question or finish match.

```javascript
const result = await nextQuestion(42);
// Returns: { index, finished, status }
```

**Logic:**
- Checks current question index
- If last question → calls `finishMatch()`
- Otherwise → returns next index

---

### `finishMatch(matchId)`

Comprehensive end-of-match processing.

```javascript
await finishMatch(42);
// Returns: void (updates database)
```

**Processing:**
1. Updates match status to FINISHED
2. Calculates per-player statistics:
   - Total correct answers
   - Average response time
3. Determines winner(s) with tie-breaking:
   - 1st: Highest score
   - 2nd: Most correct answers
   - 3rd: Fastest average response time
4. Creates scores records for match history
5. Updates user_stats for all players:
   - games_played, games_won
   - total_score, highest_score
   - correct_answers, total_answers
   - avg_response_time, average_score

**Tie-Breaking Example:**
- Player A: 850 pts, 9 correct, 2.5s avg → Winner
- Player B: 850 pts, 9 correct, 3.0s avg → Second (slower)
- Player C: 850 pts, 8 correct, 2.0s avg → Third (fewer correct)

---

### `getScoreboard(matchId)`

Get current or final scoreboard.

```javascript
const scoreboard = await getScoreboard(42);
// Returns: { matchId, status, scores, finished, currentQuestion, totalQuestions }
```

---

## Database Schema

### Matches Table

```sql
matches (
  match_id SERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'ONGOING',
  difficulty VARCHAR(50),
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Status Values:** `ONGOING`, `FINISHED`

---

### Match Rounds Table

```sql
match_rounds (
  round_id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  category_id INTEGER REFERENCES categories(category_id),
  difficulty VARCHAR(50)
)
```

---

### Match Questions Table

```sql
match_questions (
  match_question_id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  round_id INTEGER REFERENCES match_rounds(round_id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  correct_option TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL
)
```

**Note:** `content_hash` is the original question ID from trivia_questions table.

---

### Match Players Table

```sql
match_players (
  match_players_id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW()
)
```

---

### Player Answers Table

```sql
player_answers (
  answer_id SERIAL PRIMARY KEY,
  match_question_id INTEGER REFERENCES match_questions(match_question_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER,
  points_awarded INTEGER DEFAULT 0,
  answered_at TIMESTAMP DEFAULT NOW()
)
```

---

### Scores Table (Match History)

```sql
scores (
  score_id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(match_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  avg_response_time DECIMAL(10, 2)
)
```

---

## WebSocket Events (Recommended)

### Server → Client Events

```javascript
// Match state update
socket.emit('match:state', {
  matchId,
  status,
  index,
  total,
  finished,
  question,
  players
});

// New question available
socket.emit('question:new', {
  questionNumber,
  questionId
});

// Player answered
socket.emit('player:answered', {
  userId,
  username,
  isCorrect,
  pointsAwarded
});

// Match finished
socket.emit('match:finished', {
  matchId,
  winners: [userId1, userId2]
});

// Score update
socket.emit('score:update', {
  userId,
  newScore
});
```

### Client → Server Events

```javascript
// Join match room
socket.emit('match:join', { matchId, userId });

// Submit answer (alternative to HTTP)
socket.emit('answer:submit', {
  matchId,
  userId,
  matchQuestionId,
  selectedOption,
  responseTimeMs
});

// Request next question (host only)
socket.emit('question:next', { matchId });

// Leave match
socket.emit('match:leave', { matchId, userId });
```

---

## Testing

### Manual Testing with cURL

**Create match:**
```bash
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "category": "Science",
    "difficulty": "medium",
    "amount": 5,
    "players": [1, 2],
    "hostId": 1
  }'
```

**Get match state:**
```bash
curl http://localhost:3000/api/match/1/state
```

**Submit answer:**
```bash
curl -X POST http://localhost:3000/api/match/1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "matchQuestionId": 10,
    "selectedOption": "Au",
    "responseTimeMs": 3450
  }'
```

**Advance question:**
```bash
curl -X POST http://localhost:3000/api/match/1/next \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get scoreboard:**
```bash
curl http://localhost:3000/api/match/1/scoreboard
```

---

## Best Practices

### Frontend

**Track response time accurately** - Start timer when question loads  
**Disable submit after answering** - Prevent duplicate submissions  
**Show correct answer immediately** - After submission  
**Use WebSocket for real-time** - HTTP polling is inefficient  
**Handle network errors gracefully** - Retry logic for answer submission  
**Visual feedback on correctness** - Green/red highlighting  

### Backend

**Use transactions** - Match creation and finish operations  
**Validate all inputs** - Player IDs, question IDs, match status  
**Store everything in DB** - No in-memory state (scalability)  
**Calculate points server-side** - Never trust client timing  
**Emit WebSocket events** - Keep all clients synchronized  

---

## Known Issues & Limitations

### Current Limitations

1. **No spectator mode** - Only players can view match (but state endpoint is public)
2. **No pause/resume** - Matches run continuously
3. **No time limits per question** - Players can take forever (should add countdown)
4. **Host can advance anytime** - No enforcement of "all answered" rule
5. **Single round only** - Simplified version (schema supports multi-round)
6. **No rematch feature** - Must create new match manually
7. **No practice mode** - Always saves to stats

### Future Enhancements

- Question countdown timer (30-60 seconds)
- Auto-advance when all players answered
- Pause/resume functionality
- Spectator mode with view-only access
- Multi-round matches with different categories
- Rematch with same players and settings
- Practice mode (no stat tracking)
- Replay match history

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
| 400 | Category is required | Missing category in creation |
| 400 | Valid difficulty is required | Invalid difficulty value |
| 400 | At least one player ID required | Empty players array |
| 400 | All player IDs must be positive integers | Invalid player ID format |
| 400 | Amount must be between 1 and 50 | Invalid question count |
| 400 | No questions available for X at Y difficulty | No questions in database |
| 400 | One or more invalid player IDs | Player doesn't exist |
| 400 | Invalid match ID | Non-numeric match ID |
| 400 | Match already finished | Trying to answer finished match |
| 400 | Player not in this match | Unauthorized answer submission |
| 400 | Invalid question for this match | Wrong match_question_id |
| 404 | Match not found | Match doesn't exist |

---

## Performance Considerations

### Optimizations

✅ **Questions fetched once** - All loaded at match creation  
✅ **Database transactions** - ACID guarantees  
✅ **Minimal joins** - Only fetch needed data  
✅ **Indexed foreign keys** - Fast lookups  

### Potential Bottlenecks

**getCurrentQuestionIndex()** - Counts answers per question (can be cached)  
**finishMatch()** - Many database operations (use transaction)  
**Large matches** - 50 questions × 10 players = 500 answer records  

### Recommended Improvements

```javascript
// Cache current question index in Redis
const currentIndex = await redis.get(`match:${matchId}:currentIndex`);
if (currentIndex !== null) return parseInt(currentIndex);

// Batch update user stats
const updatePromises = playerStats.map(ps => updateUserStats(ps));
await Promise.all(updatePromises);
```

---

## Contact & Maintenance

This match system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/match/routes.js` - Route definitions
- `server/src/match/controller.js` - HTTP request handlers
- `server/src/match/service.js` - Business logic and scoring algorithm
- `server/src/match/store.js` - Legacy in-memory storage (deprecated)

**Dependencies:**
- `@prisma/client` - Database ORM
- `../question/service.js` - Question fetching

**Integration Points:**
- WebSocket server (`server/src/socket/`) for real-time updates
- Question service for random question fetching
- User stats for leaderboard tracking

**Last Updated:** 15 October 2025
