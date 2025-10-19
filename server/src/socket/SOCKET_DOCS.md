# WebSocket System Documentation

## Overview

The WebSocket system provides real-time bidirectional communication for live match gameplay. Built with Socket.io, it handles player synchronization, match control, answer submission, timer synchronization, and live scoreboards. All communication is authenticated with JWT tokens.

### Key Features

- **JWT Authentication** - All WebSocket connections require valid access token
- **Match Rooms** - Players join isolated rooms per match (no cross-match interference)
- **Real-Time Gameplay** - Instant answer submission and scoreboard updates
- **Synchronized Timers** - Server-controlled countdown timers (20 seconds per question)
- **Host Controls** - Match start, question advance (host-only operations)
- **Auto-Advance** - Automatic question progression when timer expires
- **Player Presence** - Join/leave notifications and active player tracking
- **Error Handling** - Graceful error messages for all failure scenarios
- **CORS Support** - Configured for cross-origin client connections

---

## Architecture

```
┌─────────────────┐
│  React Client   │  ← Socket.io-client
│  (WebSocket)    │
└────────┬────────┘
         │ WSS (JWT auth)
         ↓
┌─────────────────┐
│  Socket Server  │  ← server/src/socket/index.js
│  (Socket.io)    │     Authentication middleware
└────────┬────────┘     Connection handling
         ↓
┌─────────────────┐
│  Event Handlers │  ← server/src/socket/matchEvents.js
│  (matchEvents)  │     match:join, answer:submit, etc.
└────────┬────────┘
         ↓
┌─────────────────┐
│  Room Manager   │  ← server/src/socket/matchRooms.js
│  (matchRooms)   │     Broadcasting, room management
└────────┬────────┘
         ↓
┌─────────────────┐
│  Timer System   │  ← server/src/socket/timer.js
│  (timer)        │     20s countdowns, auto-advance
└────────┬────────┘
         ↓
┌─────────────────┐
│  Match Service  │  ← server/src/match/service.js
│  (service)      │     submitAnswer, nextQuestion, etc.
└─────────────────┘
```

---

## Client Connection

### Establishing Connection

```javascript
import { io } from 'socket.io-client';

// Get JWT token from auth system
const token = localStorage.getItem('accessToken');

// Connect to WebSocket server
const socket = io('http://localhost:3000', {
  auth: {
    token: token
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', (reason) => {
  console.log(' Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server disconnected client, attempt manual reconnect
    socket.connect();
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Likely authentication failure - redirect to login
  if (error.message.includes('Authentication')) {
    window.location.href = '/login';
  }
});

socket.on('error', (data) => {
  console.error('Socket error:', data.message);
  alert(data.message);
});
```

### Authentication

All WebSocket connections **must** include a valid JWT access token:

```javascript
// Token passed in handshake
auth: {
  token: 'your-jwt-access-token'
}
```

**Middleware Verification:**
1. Extracts token from `socket.handshake.auth.token`
2. Verifies token with `verifyAccessToken()` from auth service
3. Attaches user info to socket: `socket.userId`, `socket.username`, `socket.role`
4. Rejects connection if token missing/invalid

**Error Messages:**
- `"Authentication token required"` - No token provided
- `"Invalid or expired token"` - Token verification failed
- `"Authentication failed"` - General auth error

---

## WebSocket Events

### Room Management Events

#### `match:join`
Join a match room to receive real-time updates.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('match:join', {
  matchId: 42,
  userId: 1
});
```

**Server Response:**
```javascript
// Success
socket.on('match:joined', (data) => {
  console.log('Joined match:', data);
  // data: { matchId, roomName, playerCount }
});

// Current state
socket.on('match:state', (state) => {
  // state: { matchId, status, difficulty, players, hostId }
});

// Error
socket.on('error', (data) => {
  console.error('Join failed:', data.message);
  // "Match not found" or "You are not a player in this match"
});
```

**Broadcast to Others:**
```javascript
socket.on('player:joined', (data) => {
  console.log(`${data.username} joined the match`);
  // data: { userId, username, timestamp }
});
```

---

#### `match:leave`
Leave a match room (stop receiving updates).

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('match:leave', {
  matchId: 42,
  userId: 1
});
```

**Server Response:**
```javascript
// Confirmation
socket.on('match:left', (data) => {
  console.log('Left match:', data);
  // data: { matchId, timestamp }
});
```

**Broadcast to Others:**
```javascript
socket.on('player:left', (data) => {
  console.log(`${data.username} left the match`);
  // data: { userId, username, timestamp }
});
```

---

### Match Control Events (Host Only)

#### `match:start`
Start a match (changes status to ONGOING).

**Direction:** Client → Server  
**Authorization:** Host only

**Payload:**
```javascript
socket.emit('match:start', {
  matchId: 42
});
```

**Broadcast to All Players:**
```javascript
socket.on('match:started', (data) => {
  console.log('Match started!');
  // data: {
  //   matchId,
  //   startTime,
  //   question: { id, number, text, options },
  //   totalQuestions
  // }
});
```

**Timer Event:**
```javascript
socket.on('timer:start', (data) => {
  console.log(`Timer started: ${data.duration}s`);
  // data: { matchId, matchQuestionId, duration, timeRemaining, serverTime }
});
```

**Error (Not Host):**
```javascript
socket.on('error', (data) => {
  // "Only the host can start the match"
});
```

---

#### `question:advance`
Advance to the next question or finish match.

**Direction:** Client → Server  
**Authorization:** Host only

**Payload:**
```javascript
socket.emit('question:advance', {
  matchId: 42
});
```

**Broadcast (Next Question):**
```javascript
socket.on('question:new', (data) => {
  console.log('New question!');
  // data: {
  //   matchId,
  //   questionNumber,
  //   totalQuestions,
  //   question: { id, number, text, options },
  //   timestamp
  // }
});

socket.on('timer:start', (data) => {
  // New 20s timer starts
});
```

**Broadcast (Match Finished):**
```javascript
socket.on('match:finished', (data) => {
  console.log('Match complete!', data.winner);
  // data: {
  //   matchId,
  //   finalScores: [{ userId, username, score }],
  //   winner: { userId, username, score },
  //   timestamp
  // }
});
```

---

### Gameplay Events

#### `answer:submit`
Submit an answer for the current question.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('answer:submit', {
  matchId: 42,
  matchQuestionId: 125,
  selectedOption: "Au",
  responseTimeMs: 3450
});
```

**Personal Confirmation:**
```javascript
socket.on('answer:confirmed', (data) => {
  console.log('Answer submitted:', data.isCorrect ? '✓' : '✗');
  // data: { matchId, isCorrect, points, timestamp }
});
```

**Broadcast to Others:**
```javascript
socket.on('answer:received', (data) => {
  console.log(`${data.username} submitted their answer`);
  // data: { userId, username, timestamp }
  // Note: Does NOT reveal if they were correct
});
```

**All Players Answered:**
```javascript
socket.on('question:ended', (data) => {
  console.log('Everyone answered! Correct:', data.correctAnswer);
  // data: {
  //   matchId,
  //   correctAnswer,
  //   scoreboard: [{ userId, username, score }],
  //   allAnswered: true,
  //   timestamp
  // }
});
```

**Error:**
```javascript
socket.on('error', (data) => {
  // "Match not found", "Player not in this match", etc.
});
```

---

### State Query Events

#### `match:state:request`
Request current match state.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('match:state:request', {
  matchId: 42
});
```

**Response:**
```javascript
socket.on('match:state', (state) => {
  // Same format as HTTP GET /api/match/:id/state
});
```

---

#### `scoreboard:request`
Request current scoreboard.

**Direction:** Client → Server

**Payload:**
```javascript
socket.emit('scoreboard:request', {
  matchId: 42
});
```

**Response:**
```javascript
socket.on('scoreboard:update', (scoreboard) => {
  // Same format as HTTP GET /api/match/:id/scoreboard
});
```

---

### Timer Events (Server → Client)

#### `timer:start`
Timer countdown begins.

**Broadcast to All Players:**
```javascript
socket.on('timer:start', (data) => {
  console.log(`Timer: ${data.duration}s`);
  // data: { matchId, matchQuestionId, duration, timeRemaining, serverTime }
  
  // Start client-side visual countdown
  startCountdown(data.duration);
});
```

---

#### `timer:tick`
Timer countdown update (every second).

**Broadcast to All Players:**
```javascript
socket.on('timer:tick', (data) => {
  console.log(`Time remaining: ${data.timeRemaining}s`);
  // data: { matchId, matchQuestionId, timeRemaining, serverTime }
  
  // Update countdown display
  updateCountdown(data.timeRemaining);
});
```

---

#### `timer:expired`
Timer reached 0.

**Broadcast to All Players:**
```javascript
socket.on('timer:expired', (data) => {
  console.log(' Time is up!');
  // data: { matchId, matchQuestionId, message, timestamp }
  
  // Show "Time's Up!" message
  // Question will auto-advance in 3 seconds
});
```

---

#### `timer:paused` / `timer:resumed`
Timer paused/resumed (future feature).

```javascript
socket.on('timer:paused', (data) => {
  // data: { matchId, timeRemaining }
});

socket.on('timer:resumed', (data) => {
  // data: { matchId, timeRemaining }
});
```

---

## Complete React Integration

### Custom Hook: `useMatchSocket`

```javascript
// hooks/useMatchSocket.js
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';

export function useMatchSocket(matchId) {
  const { accessToken, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken || !matchId) return;

    // Create socket connection
    const newSocket = io('http://localhost:3000', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Auto-join match room
      newSocket.emit('match:join', {
        matchId,
        userId: user.userId
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    // Match events
    newSocket.on('match:joined', (data) => {
      console.log('Joined match room:', data);
    });

    newSocket.on('match:state', (state) => {
      setMatchState(state);
    });

    newSocket.on('match:started', (data) => {
      console.log('Match started!', data);
      setMatchState(prev => ({ ...prev, status: 'ONGOING' }));
    });

    newSocket.on('question:new', (data) => {
      console.log('New question:', data);
      setMatchState(prev => ({
        ...prev,
        currentQuestion: data.question,
        questionNumber: data.questionNumber
      }));
      setTimeRemaining(20); // Reset timer
    });

    newSocket.on('match:finished', (data) => {
      console.log('Match finished!', data);
      setMatchState(prev => ({ ...prev, status: 'FINISHED', winner: data.winner }));
    });

    // Timer events
    newSocket.on('timer:start', (data) => {
      setTimeRemaining(data.timeRemaining);
    });

    newSocket.on('timer:tick', (data) => {
      setTimeRemaining(data.timeRemaining);
    });

    newSocket.on('timer:expired', () => {
      console.log('Time is up!');
      setTimeRemaining(0);
    });

    // Player events
    newSocket.on('player:joined', (data) => {
      console.log(`${data.username} joined`);
    });

    newSocket.on('player:left', (data) => {
      console.log(`${data.username} left`);
    });

    newSocket.on('answer:received', (data) => {
      console.log(`${data.username} submitted answer`);
    });

    // Error handling
    newSocket.on('error', (data) => {
      console.error('Socket error:', data.message);
      alert(data.message);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('match:leave', { matchId, userId: user.userId });
        newSocket.disconnect();
      }
    };
  }, [accessToken, matchId, user]);

  return {
    socket,
    matchState,
    timeRemaining,
    isConnected
  };
}
```

---

### Match Lobby Component

```javascript
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatchSocket } from '../hooks/useMatchSocket';
import { useAuth } from '../contexts/AuthContext';

function MatchLobby() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const { socket, matchState, isConnected } = useMatchSocket(matchId);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const isHost = matchState?.hostId === user.userId;

  const handleStartMatch = () => {
    if (!socket || !isHost) return;
    setStarting(true);
    socket.emit('match:start', { matchId: parseInt(matchId) });
  };

  // Listen for match start
  React.useEffect(() => {
    if (!socket) return;

    socket.on('match:started', () => {
      // Navigate to gameplay screen
      navigate(`/match/${matchId}/play`);
    });

    return () => {
      socket.off('match:started');
    };
  }, [socket, matchId, navigate]);

  if (!matchState) return <div>Loading...</div>;

  return (
    <div className="match-lobby">
      <h1>Match Lobby</h1>
      
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <div className="match-info">
        <p>Match ID: {matchId}</p>
        <p>Difficulty: {matchState.difficulty}</p>
        <p>Status: {matchState.status}</p>
      </div>

      <div className="players-list">
        <h2>Players ({matchState.players?.length})</h2>
        {matchState.players?.map((player) => (
          <div key={player.userId} className="player-item">
            <span>{player.username}</span>
            {player.userId === matchState.hostId && <span className="host-badge"> Host</span>}
            {player.isReady && <span className="ready-badge">Ready</span>}
          </div>
        ))}
      </div>

      {isHost && matchState.status !== 'ONGOING' && (
        <button
          onClick={handleStartMatch}
          disabled={starting || !isConnected}
          className="start-button"
        >
          {starting ? 'Starting...' : '🎮 Start Match'}
        </button>
      )}

      {!isHost && (
        <p className="waiting-message">Waiting for host to start the match...</p>
      )}
    </div>
  );
}

export default MatchLobby;
```

---

### Live Gameplay Component

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatchSocket } from '../hooks/useMatchSocket';
import { useAuth } from '../contexts/AuthContext';

function MatchPlay() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const { socket, matchState, timeRemaining, isConnected } = useMatchSocket(matchId);
  const navigate = useNavigate();
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  const isHost = matchState?.hostId === user.userId;

  // Track when question loads
  useEffect(() => {
    if (matchState?.currentQuestion) {
      setQuestionStartTime(Date.now());
      setAnswered(false);
      setSelectedOption(null);
      setAnswerResult(null);
    }
  }, [matchState?.currentQuestion]);

  // Listen for answer confirmation
  useEffect(() => {
    if (!socket) return;

    socket.on('answer:confirmed', (data) => {
      setAnswerResult(data);
      setAnswered(true);
    });

    socket.on('question:ended', (data) => {
      // Show correct answer and scoreboard
      console.log('Question ended:', data);
    });

    socket.on('match:finished', () => {
      // Navigate to scoreboard
      navigate(`/match/${matchId}/scoreboard`);
    });

    return () => {
      socket.off('answer:confirmed');
      socket.off('question:ended');
      socket.off('match:finished');
    };
  }, [socket, matchId, navigate]);

  const handleSubmitAnswer = () => {
    if (!socket || !selectedOption || answered) return;

    const responseTimeMs = Date.now() - questionStartTime;

    socket.emit('answer:submit', {
      matchId: parseInt(matchId),
      matchQuestionId: matchState.currentQuestion.id,
      selectedOption,
      responseTimeMs
    });
  };

  const handleAdvance = () => {
    if (!socket || !isHost) return;
    socket.emit('question:advance', { matchId: parseInt(matchId) });
  };

  if (!matchState?.currentQuestion) {
    return <div>Loading question...</div>;
  }

  return (
    <div className="match-play">
      {/* Connection Status */}
      <div className={`connection ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢' : '🔴'}
      </div>

      {/* Timer */}
      <div className="timer">
        <div className={`countdown ${timeRemaining <= 5 ? 'urgent' : ''}`}>
          ⏱️ {timeRemaining}s
        </div>
        <div className="timer-bar">
          <div
            className="timer-fill"
            style={{ width: `${(timeRemaining / 20) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Progress */}
      <div className="progress">
        Question {matchState.questionNumber} of {matchState.totalQuestions}
      </div>

      {/* Question */}
      <div className="question">
        <h2>{matchState.currentQuestion.text}</h2>
      </div>

      {/* Options */}
      <div className="options">
        {matchState.currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => !answered && setSelectedOption(option)}
            disabled={answered}
            className={`option ${selectedOption === option ? 'selected' : ''} ${
              answered && answerResult?.isCorrect && selectedOption === option ? 'correct' : ''
            } ${
              answered && !answerResult?.isCorrect && selectedOption === option ? 'wrong' : ''
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      {!answered && (
        <button
          onClick={handleSubmitAnswer}
          disabled={!selectedOption || answered}
          className="submit-button"
        >
          Submit Answer
        </button>
      )}

      {/* Answer Result */}
      {answered && answerResult && (
        <div className={`result ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
          <h3>{answerResult.isCorrect ? 'Correct!' : ' Wrong!'}</h3>
          {answerResult.isCorrect && (
            <p>Points earned: {answerResult.points}</p>
          )}
        </div>
      )}

      {/* Host Controls */}
      {isHost && (
        <button onClick={handleAdvance} className="advance-button">
          Next Question
        </button>
      )}

      {/* Scoreboard Preview */}
      <div className="mini-scoreboard">
        {matchState.players?.map((player) => (
          <div key={player.userId} className="player-score">
            <span>{player.username}</span>
            <span>{player.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MatchPlay;
```

---

## Server Implementation Details

### Socket Initialization (`index.js`)

**CORS Configuration:**
```javascript
cors: {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST']
}
```

**Connection Settings:**
```javascript
pingTimeout: 60000,   // 60s before considering connection lost
pingInterval: 25000   // Ping every 25s to check connection
```

**Authentication Middleware:**
- Runs on every connection attempt
- Extracts token from `socket.handshake.auth.token`
- Calls `verifyAccessToken()` from auth service
- Attaches `userId`, `username`, `role` to socket
- Rejects with error if auth fails

---

### Match Event Handlers (`matchEvents.js`)

**Event Registration:**
All events registered in `handleMatchEvents(io, socket)` function.

**Host-Only Validation:**
```javascript
const match = await prisma.matches.findUnique({
  where: { match_id: matchId }
});

if (match.host_id !== socket.userId) {
  socket.emit('error', { message: 'Only the host can ...' });
  return;
}
```

**Broadcasting Pattern:**
```javascript
// To all players in match (including sender)
broadcastToMatch(io, matchId, 'event:name', data);

// To all players except sender
socket.to(`match:${matchId}`).emit('event:name', data);

// To sender only
socket.emit('event:name', data);
```

---

### Room Management (`matchRooms.js`)

**Room Naming:**
- Rooms named `match:{matchId}` (e.g., `match:42`)
- Players join/leave rooms via `socket.join()` / `socket.leave()`

**Player Validation:**
- Checks player is in `match_players` table
- Returns error if not a participant

**Active Player Count:**
```javascript
const activeCount = await getActivePlayersInMatch(io, matchId);
// Returns number of connected sockets in room
```

---

### Timer System (`timer.js`)

**Default Timer:** 20 seconds per question (per project spec)

**Timer Storage:**
```javascript
activeTimers = Map<matchId, {
  interval: NodeJS.Timeout,
  timeRemaining: number,
  matchQuestionId: number,
  duration: number
}>
```

**Timer Lifecycle:**
1. **Start:** `startQuestionTimer(io, matchId, questionId, 20)`
   - Broadcasts `timer:start` immediately
   - Sets interval to tick every 1 second
   - Stores in `activeTimers` Map

2. **Tick:** Every 1 second
   - Decrements `timeRemaining`
   - Broadcasts `timer:tick` to all players
   - Checks if reached 0

3. **Expire:** When `timeRemaining === 0`
   - Stops interval
   - Broadcasts `timer:expired`
   - Waits 3 seconds (show "Time's Up!" message)
   - Auto-advances to next question
   - Starts new timer

4. **Stop:** `stopQuestionTimer(matchId)`
   - Clears interval
   - Removes from `activeTimers`
   - Called on manual advance or match end

**Auto-Advance Logic:**
```javascript
// Wait 3s to show "time's up" message
setTimeout(async () => {
  const result = await nextQuestion(matchId);
  
  if (result.finished) {
    // Broadcast match:finished with final scores
  } else {
    // Broadcast question:new with next question
    // Start new 20s timer
  }
}, 3000);
```

---

## Testing

### Manual Testing with Socket.io Client

```javascript
// test-websocket.js
import { io } from 'socket.io-client';

const token = 'your-jwt-token';
const socket = io('http://localhost:3000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('Connected');
  
  // Join match
  socket.emit('match:join', { matchId: 1, userId: 1 });
});

socket.on('match:joined', (data) => {
  console.log('Joined:', data);
  
  // Start match (if host)
  socket.emit('match:start', { matchId: 1 });
});

socket.on('match:started', (data) => {
  console.log('Match started:', data);
  
  // Submit answer
  socket.emit('answer:submit', {
    matchId: 1,
    matchQuestionId: data.question.id,
    selectedOption: data.question.options[0],
    responseTimeMs: 2000
  });
});

socket.on('answer:confirmed', (data) => {
  console.log('Answer result:', data);
});

socket.on('timer:tick', (data) => {
  console.log(`⏱️  ${data.timeRemaining}s`);
});
```

---

## Best Practices

### Frontend

**Reconnection handling** - Enable automatic reconnection  
**Token refresh** - Reconnect with new token on expiry  
**Visual feedback** - Show connection status indicator  
**Error handling** - Display error messages to user  
**Cleanup** - Disconnect socket on component unmount  
**Event unsubscribe** - Remove listeners in useEffect cleanup  
**Room management** - Emit `match:leave` before disconnect  

### Backend

**Authentication** - Always validate JWT tokens  
**Authorization** - Check host status for restricted actions  
**Room isolation** - Use rooms to prevent cross-match leaks  
**Error broadcasting** - Send specific error messages  
**Logging** - Console log all major events  
**Timer cleanup** - Clear intervals on match end  
**Database validation** - Verify match/player exists  

---

## Known Issues & Limitations

### Current Limitations

1. **No spectator mode** - Must be player to join room
2. **No pause/resume** - Matches run continuously once started
3. **Fixed 20s timer** - Cannot customize timer duration per match
4. **No reconnection recovery** - Disconnected players miss events
5. **No player kick** - Host cannot remove players mid-match
6. **No timer sync correction** - Client timer can drift from server
7. **No bandwidth optimization** - Sends full state on every update
8. **Single host** - Only one player has control (no co-hosts)

### Future Enhancements

- Spectator mode (view-only connections)
- Pause/resume functionality (host control)
- Configurable timer duration (per match settings)
- Reconnection recovery (restore state on reconnect)
- Player kick/ban (host moderation)
- Timer drift correction (periodic sync messages)
- Delta updates (send only changed data)
- Co-host support (multiple admins)
- Player "ready" status (before match start)
- Match replay/recording (for post-game review)

---

## Performance Considerations

### Optimizations

✅ **Room-based broadcasting** - Only send to relevant players  
✅ **Event throttling** - Timer ticks once per second (not continuous)  
✅ **Minimal payloads** - Only send necessary data  
✅ **Connection pooling** - Reuse database connections  

### Potential Bottlenecks

**Many concurrent matches** - Each match has active timer interval  
**Large player counts** - Broadcasting overhead scales with players  
**Database queries per event** - Auth checks hit database  
**Timer accuracy** - JavaScript timers not guaranteed precise  

### Recommended Improvements

```javascript
// Cache match/player data in Redis
const matchCache = await redis.get(`match:${matchId}`);

// Use Socket.io Redis adapter for horizontal scaling
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(pubClient, subClient));

// Delta updates instead of full state
socket.emit('score:update', { userId, scoreDelta: 10 });

// High-precision timer with drift correction
setInterval(() => {
  const drift = Date.now() - expectedTime;
  // Adjust next tick timing
}, 1000);
```

---

## Error Handling

### Error Response Format

```javascript
socket.emit('error', {
  message: 'Error description',
  code: 'ERROR_CODE', // optional
  context: { ... }     // optional
});
```

### Common Errors

| Event | Error Message | Cause |
|-------|---------------|-------|
| connection | Authentication token required | No token in handshake |
| connection | Invalid or expired token | Token verification failed |
| match:join | Match not found | Invalid matchId |
| match:join | You are not a player in this match | User not in match_players |
| match:start | Only the host can start the match | Non-host tried to start |
| question:advance | Only the host can advance questions | Non-host tried to advance |
| answer:submit | Match not found | Invalid matchId |
| answer:submit | Match already finished | Tried to answer after match end |
| answer:submit | Player not in this match | User not in match_players |

---

## Environment Variables

```bash
# WebSocket CORS origin (client URL)
CLIENT_URL=http://localhost:5173

# Server port (WebSocket shares HTTP server)
PORT=3000
```

---

## Integration with HTTP API

### Hybrid Approach

**Use HTTP for:**
- Match creation (`POST /api/match`)
- Initial state fetch (`GET /api/match/:id/state`)
- Historical data (`GET /api/match/:id/scoreboard`)

**Use WebSocket for:**
- Real-time gameplay events
- Live scoreboard updates
- Timer synchronization
- Player presence notifications

### Example Flow

```
1. HTTP: Create match → POST /api/match
2. WebSocket: Connect and join → match:join
3. WebSocket: Host starts → match:start
4. WebSocket: Submit answers → answer:submit
5. WebSocket: Advance questions → question:advance
6. WebSocket: Match finishes → match:finished
7. HTTP: View final results → GET /api/match/:id/scoreboard
```

---

## Deployment Considerations

### Production Checklist

**Use WSS (secure WebSocket)** - Enable TLS/SSL  
**Configure proper CORS** - Whitelist production domains  
**Enable Redis adapter** - For multi-server scaling  
**Set connection limits** - Prevent resource exhaustion  
**Monitor active connections** - Track socket count  
**Implement rate limiting** - Prevent spam/abuse  
**Log all events** - For debugging and analytics  
**Graceful shutdown** - Close sockets on server stop  

### Scaling with Redis

```javascript
// Install Redis adapter
npm install @socket.io/redis-adapter redis

// Configure Socket.io
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Benefits:**
- Multiple server instances share room state
- Horizontal scaling for high traffic
- Persistent connection management

---

## Contact & Maintenance

This WebSocket system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/socket/index.js` - Socket.io initialization and authentication
- `server/src/socket/matchEvents.js` - Match-related event handlers
- `server/src/socket/matchRooms.js` - Room management and broadcasting
- `server/src/socket/timer.js` - Server-side timer system (20s per question)

**Dependencies:**
- `socket.io` - WebSocket server library
- `@prisma/client` - Database access
- `../auth/service.js` - JWT token verification
- `../match/service.js` - Match business logic

**Integration Points:**
- HTTP server (`server/src/app.js`) - Shares Express server
- Auth service - Token verification
- Match service - Gameplay logic
- Frontend React app - Socket.io-client

**Key Features Implemented:**
- JWT authentication for all connections
- Room-based match isolation
- Server-controlled synchronized timers (20s)
- Auto-advance on timer expiry
- Host-only controls with validation
- Real-time scoreboard updates
- Player presence tracking

**Last Updated:** 15 October 2025
