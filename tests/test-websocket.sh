#!/bin/bash
# Test WebSocket System - Real-time Match Functionality

BASE_URL="http://localhost:3001"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}==========================================="
echo "Testing WebSocket System"
echo -e "===========================================${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}[PRE-CHECK] Verifying server is running...${NC}"
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo -e "${RED}✗ Server is not running on port 3001${NC}"
  echo ""
  echo -e "${YELLOW}Please start the server first:${NC}"
  echo -e "  ${BOLD}cd server && npm run dev${NC}"
  echo ""
  echo "Or in a separate terminal:"
  echo -e "  ${BOLD}make dev-server${NC}"
  echo ""
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is required but not installed${NC}"
    echo "  Please install Node.js to run this test"
    exit 1
fi

# ========================================
# SETUP: Create and authenticate users
# ========================================

echo -e "${BLUE}[SETUP] Creating test users...${NC}"
echo ""

TIMESTAMP=$(date +%s)
PLAYER1_EMAIL="ws_player1_${TIMESTAMP}@example.com"
PLAYER1_PASSWORD="Player1Pass123"
PLAYER2_EMAIL="ws_player2_${TIMESTAMP}@example.com"
PLAYER2_PASSWORD="Player2Pass123"

# Register Player 1
echo -e "${BOLD}Registering Player 1...${NC}"
PLAYER1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"ws_player1_${TIMESTAMP}\",
    \"email\": \"${PLAYER1_EMAIL}\",
    \"password\": \"${PLAYER1_PASSWORD}\"
  }")

PLAYER1_TOKEN=$(echo "$PLAYER1_RESPONSE" | jq -r '.accessToken')
PLAYER1_ID=$(echo "$PLAYER1_RESPONSE" | jq -r '.user.userId')

if [ "$PLAYER1_TOKEN" = "null" ] || [ -z "$PLAYER1_TOKEN" ]; then
  echo -e "${RED}✗ Failed to register Player 1${NC}"
  echo "$PLAYER1_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Player 1 registered (ID: ${PLAYER1_ID})${NC}"
echo ""

# Register Player 2
echo -e "${BOLD}Registering Player 2...${NC}"
PLAYER2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"ws_player2_${TIMESTAMP}\",
    \"email\": \"${PLAYER2_EMAIL}\",
    \"password\": \"${PLAYER2_PASSWORD}\"
  }")

PLAYER2_TOKEN=$(echo "$PLAYER2_RESPONSE" | jq -r '.accessToken')
PLAYER2_ID=$(echo "$PLAYER2_RESPONSE" | jq -r '.user.userId')

if [ "$PLAYER2_TOKEN" = "null" ] || [ -z "$PLAYER2_TOKEN" ]; then
  echo -e "${RED}✗ Failed to register Player 2${NC}"
  echo "$PLAYER2_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Player 2 registered (ID: ${PLAYER2_ID})${NC}"
echo ""

# ========================================
# Create a match with questions
# ========================================

echo -e "${BLUE}[SETUP] Creating match with questions...${NC}"
echo ""

echo -e "${BOLD}Creating a match...${NC}"
MATCH_RESPONSE=$(curl -s -X POST $BASE_URL/api/match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLAYER1_TOKEN" \
  -d "{
    \"category\": \"Science\",
    \"difficulty\": \"easy\",
    \"amount\": 3,
    \"players\": [${PLAYER1_ID}, ${PLAYER2_ID}],
    \"hostId\": ${PLAYER1_ID}
  }")

MATCH_ID=$(echo "$MATCH_RESPONSE" | jq -r '.matchId')

if [ "$MATCH_ID" = "null" ] || [ -z "$MATCH_ID" ]; then
  echo -e "${RED}✗ Failed to create match${NC}"
  echo "$MATCH_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Match created (ID: ${MATCH_ID})${NC}"
echo ""

# ========================================
# Run Node.js WebSocket Tests
# ========================================

echo -e "${BLUE}[WEBSOCKET TESTS] Running Node.js client...${NC}"
echo ""

# Create temporary Node.js test script
cat > /tmp/test-websocket-$$.js << 'EOJS'
const io = require('socket.io-client');

// Parse command line arguments
const [matchId, player1Id, player1Token, player2Id, player2Token] = process.argv.slice(2);

let testsPassed = 0;
let testsFailed = 0;
let isTestComplete = false;

// Color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

console.log(`${BOLD}Connecting WebSocket clients...${NC}\n`);

// Connect Player 1
const socket1 = io('http://localhost:3001', {
  auth: { token: player1Token },
  transports: ['websocket']
});

// Connect Player 2
const socket2 = io('http://localhost:3001', {
  auth: { token: player2Token },
  transports: ['websocket']
});

let player1Connected = false;
let player2Connected = false;
let player1JoinedRoom = false;
let player2JoinedRoom = false;
let matchStarted = false;
let questionReceived = false;
let timerStarted = false;
let timerTickReceived = false;
let answerSubmitted = false;
let questionAdvanced = false;

// Test timeout
const timeout = setTimeout(() => {
  console.log(`\n${RED}✗ Test timeout after 30 seconds${NC}`);
  printResults();
  process.exit(1);
}, 30000);

// Helper to check if all tests are done
function checkComplete() {
  if (player1Connected && player2Connected && 
      player1JoinedRoom && player2JoinedRoom &&
      matchStarted && questionReceived && 
      timerStarted && timerTickReceived &&
      answerSubmitted && questionAdvanced) {
    isTestComplete = true;
    clearTimeout(timeout);
    setTimeout(() => {
      printResults();
      process.exit(testsFailed > 0 ? 1 : 0);
    }, 1000);
  }
}

function printResults() {
  console.log(`\n${BOLD}===========================================${NC}`);
  console.log(`${BOLD}Test Results${NC}`);
  console.log(`${BOLD}===========================================${NC}`);
  console.log(`${GREEN}Passed: ${testsPassed}${NC}`);
  console.log(`${RED}Failed: ${testsFailed}${NC}`);
  if (testsFailed === 0) {
    console.log(`\n${GREEN}${BOLD}✓ All WebSocket tests passed!${NC}\n`);
  } else {
    console.log(`\n${RED}${BOLD}✗ Some tests failed${NC}\n`);
  }
  
  socket1.disconnect();
  socket2.disconnect();
}

// ========================================
// Player 1 Event Handlers
// ========================================

socket1.on('connect', () => {
  console.log(`${GREEN}✓ Player 1 connected to WebSocket server${NC}`);
  player1Connected = true;
  testsPassed++;
  
  // Join match room
  console.log(`${BLUE}[Player 1] Joining match ${matchId}...${NC}`);
  socket1.emit('match:join', { matchId: parseInt(matchId), userId: parseInt(player1Id) });
});

socket1.on('match:joined', (data) => {
  console.log(`${GREEN}✓ Player 1 joined match room${NC}`);
  player1JoinedRoom = true;
  testsPassed++;
  
  // Wait for player 2 to join, then start match
  setTimeout(() => {
    if (player2JoinedRoom && !matchStarted) {
      console.log(`${BLUE}[Player 1 - Host] Starting match...${NC}`);
      socket1.emit('match:start', { matchId: parseInt(matchId) });
    }
  }, 1000);
});

socket1.on('match:started', (data) => {
  if (!matchStarted) {
    console.log(`${GREEN}✓ Match started event received by Player 1${NC}`);
    if (data.question && data.question.question) {
      console.log(`   Current question: ${data.question.question.substring(0, 50)}...`);
    }
    matchStarted = true;
    testsPassed++;
  }
});

socket1.on('question:new', (data) => {
  if (!questionReceived) {
    console.log(`${GREEN}✓ New question received by Player 1${NC}`);
    // data.question is an object with a 'question' field containing the text
    const questionText = data.question?.text || data.question?.question || JSON.stringify(data.question).substring(0, 50);
    if (typeof questionText === 'string') {
      console.log(`   Question: ${questionText.substring(0, 50)}...`);
    }
    questionReceived = true;
    testsPassed++;
    
    // Submit an answer after receiving question
    setTimeout(() => {
      if (!answerSubmitted) {
        console.log(`${BLUE}[Player 1] Submitting answer...${NC}`);
        socket1.emit('answer:submit', {
          matchId: parseInt(matchId),
          matchQuestionId: data.question.id,
          selectedOption: data.question.options[0], // Submit first option
          responseTimeMs: 5000
        });
        answerSubmitted = true;
      }
    }, 2000);
  }
});

socket1.on('timer:start', (data) => {
  if (!timerStarted) {
    console.log(`${GREEN}✓ Timer started by Player 1${NC}`);
    console.log(`   Duration: ${data.duration} seconds`);
    timerStarted = true;
    testsPassed++;
  }
});

socket1.on('timer:tick', (data) => {
  if (!timerTickReceived) {
    console.log(`${GREEN}✓ Timer tick received by Player 1${NC}`);
    console.log(`   Time remaining: ${data.timeRemaining} seconds`);
    timerTickReceived = true;
    testsPassed++;
  }
});

socket1.on('answer:confirmed', (data) => {
  console.log(`${GREEN}✓ Answer confirmed for Player 1${NC}`);
  console.log(`   Correct: ${data.isCorrect}, Points: ${data.points}`);
  testsPassed++;
  
  // Host advances question after both players answer or after short delay
  setTimeout(() => {
    if (!questionAdvanced) {
      console.log(`${BLUE}[Player 1 - Host] Advancing to next question...${NC}`);
      socket1.emit('question:advance', { matchId: parseInt(matchId) });
      questionAdvanced = true;
    }
  }, 1000);
});

socket1.on('answer:received', (data) => {
  console.log(`${GREEN}✓ Player ${data.username} submitted answer (seen by Player 1)${NC}`);
  checkComplete();
});

socket1.on('scoreboard:update', (data) => {
  console.log(`${BLUE}[Player 1] Scoreboard updated${NC}`);
  console.log(`   Players: ${data.scores.length}`);
});

socket1.on('connect_error', (err) => {
  console.log(`${RED}✗ Player 1 connection error: ${err.message}${NC}`);
  testsFailed++;
});

socket1.on('error', (err) => {
  console.log(`${RED}✗ Player 1 error: ${err.message}${NC}`);
  testsFailed++;
});

// ========================================
// Player 2 Event Handlers
// ========================================

socket2.on('connect', () => {
  console.log(`${GREEN}✓ Player 2 connected to WebSocket server${NC}`);
  player2Connected = true;
  testsPassed++;
  
  // Join match room
  console.log(`${BLUE}[Player 2] Joining match ${matchId}...${NC}`);
  socket2.emit('match:join', { matchId: parseInt(matchId), userId: parseInt(player2Id) });
});

socket2.on('match:joined', (data) => {
  console.log(`${GREEN}✓ Player 2 joined match room${NC}`);
  player2JoinedRoom = true;
  testsPassed++;
  checkComplete();
});

socket2.on('match:started', (data) => {
  console.log(`${GREEN}✓ Match started event received by Player 2${NC}`);
  checkComplete();
});

socket2.on('question:new', (data) => {
  console.log(`${GREEN}✓ New question received by Player 2${NC}`);
  
  // Submit an answer
  setTimeout(() => {
    console.log(`${BLUE}[Player 2] Submitting answer...${NC}`);
    socket2.emit('answer:submit', {
      matchId: parseInt(matchId),
      matchQuestionId: data.question.id,
      selectedOption: data.question.options[1], // Submit second option
      responseTimeMs: 7000
    });
  }, 1500);
});

socket2.on('timer:start', (data) => {
  console.log(`${GREEN}✓ Timer started by Player 2${NC}`);
  checkComplete();
});

socket2.on('timer:tick', (data) => {
  console.log(`${BLUE}[Player 2] Timer tick: ${data.timeRemaining}s${NC}`);
  checkComplete();
});

socket2.on('answer:confirmed', (data) => {
  console.log(`${GREEN}✓ Answer confirmed for Player 2${NC}`);
  console.log(`   Correct: ${data.isCorrect}, Points: ${data.points}`);
  testsPassed++;
  checkComplete();
});

socket2.on('answer:received', (data) => {
  console.log(`${GREEN}✓ Player ${data.username} submitted answer (seen by Player 2)${NC}`);
  checkComplete();
});

socket2.on('scoreboard:update', (data) => {
  console.log(`${BLUE}[Player 2] Scoreboard updated${NC}`);
  checkComplete();
});

socket2.on('connect_error', (err) => {
  console.log(`${RED}✗ Player 2 connection error: ${err.message}${NC}`);
  testsFailed++;
});

socket2.on('error', (err) => {
  console.log(`${RED}✗ Player 2 error: ${err.message}${NC}`);
  testsFailed++;
});
EOJS

# Check if socket.io-client is installed in server directory
SERVER_DIR="/home/tiaan/cs343_git/group-23-rw343-project-2/server"

if [ ! -d "$SERVER_DIR/node_modules/socket.io-client" ]; then
  echo -e "${YELLOW}Installing socket.io-client for testing...${NC}"
  cd "$SERVER_DIR"
  npm install --no-save socket.io-client 2>&1 | grep -E "(added|up to date)" || {
    echo -e "${RED}✗ Failed to install socket.io-client${NC}"
    echo "  Please run: cd server && npm install socket.io-client"
    exit 1
  }
  echo -e "${GREEN}✓ socket.io-client installed${NC}"
  echo ""
fi

# Run the Node.js test with NODE_PATH set to find socket.io-client
cd "$SERVER_DIR"
NODE_PATH="$SERVER_DIR/node_modules" node /tmp/test-websocket-$$.js "$MATCH_ID" "$PLAYER1_ID" "$PLAYER1_TOKEN" "$PLAYER2_ID" "$PLAYER2_TOKEN"
TEST_EXIT_CODE=$?

# Cleanup
rm /tmp/test-websocket-$$.js

exit $TEST_EXIT_CODE
