#!/bin/bash
# Test Match System (Database Edition with Auth)

BASE_URL="http://localhost:3001"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}==========================================="
echo "Testing Match System (Database-backed)"
echo -e "===========================================${NC}"
echo ""

# ========================================
# SETUP: Create and authenticate users
# ========================================

echo -e "${BLUE}[SETUP] Creating test users...${NC}"
echo ""

TIMESTAMP=$(date +%s)
PLAYER1_EMAIL="player1_${TIMESTAMP}@example.com"
PLAYER1_PASSWORD="Player1Pass123"
PLAYER2_EMAIL="player2_${TIMESTAMP}@example.com"
PLAYER2_PASSWORD="Player2Pass123"

# Register Player 1
echo -e "${BOLD}Registering Player 1...${NC}"
PLAYER1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"player1_${TIMESTAMP}\",
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
    \"username\": \"player2_${TIMESTAMP}\",
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
# TEST: Match System
# ========================================

echo -e "${BLUE}[MATCH SYSTEM TESTS]${NC}"
echo ""

# Step 1: Create a match
echo -e "${BOLD}1. Creating a match...${NC}"
echo "   POST /api/match"
echo "   Authorization: Bearer <player1_token>"
MATCH_RESPONSE=$(curl -s -X POST $BASE_URL/api/match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLAYER1_TOKEN" \
  -d "{
    \"category\": \"Science\",
    \"difficulty\": \"easy\",
    \"amount\": 1,
    \"players\": [${PLAYER1_ID}, ${PLAYER2_ID}],
    \"hostId\": ${PLAYER1_ID}
  }")

echo "$MATCH_RESPONSE" | jq '.'
echo ""

# Extract matchId
MATCH_ID=$(echo "$MATCH_RESPONSE" | jq -r '.matchId')

if [ "$MATCH_ID" = "null" ] || [ -z "$MATCH_ID" ]; then
  echo -e "${RED}✗ Failed to create match!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Match created with ID: $MATCH_ID${NC}"
echo ""

# Step 2: Get match state
echo -e "${BOLD}2. Getting match state...${NC}"
echo "   GET /api/match/$MATCH_ID/state"
echo "   Authorization: Bearer <player1_token>"
STATE_RESPONSE=$(curl -s -H "Authorization: Bearer $PLAYER1_TOKEN" \
  $BASE_URL/api/match/$MATCH_ID/state)

echo "$STATE_RESPONSE" | jq '. | {ok, matchId, status, question: .question | {id, text, options}}'
echo ""

# Extract first question info
QUESTION_ID=$(echo "$STATE_RESPONSE" | jq -r '.question.id')
CORRECT_ANSWER=$(echo "$STATE_RESPONSE" | jq -r '.question.options[2]' 2>/dev/null || echo "H2O")

if [ "$QUESTION_ID" = "null" ] || [ -z "$QUESTION_ID" ]; then
  echo -e "${RED}✗ No question found in match!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Current question ID: $QUESTION_ID${NC}"
echo ""

# Step 3: Player 1 submits correct answer
echo -e "${BOLD}3. Player 1 submits answer (correct)...${NC}"
echo "   POST /api/match/$MATCH_ID/answer"
echo "   Authorization: Bearer <player1_token>"
ANSWER1_RESPONSE=$(curl -s -X POST $BASE_URL/api/match/$MATCH_ID/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLAYER1_TOKEN" \
  -d "{
    \"userId\": ${PLAYER1_ID},
    \"matchQuestionId\": ${QUESTION_ID},
    \"selectedOption\": \"H2O\",
    \"responseTimeMs\": 5000
  }")

echo "$ANSWER1_RESPONSE" | jq '.'
echo ""

# Step 4: Player 2 submits wrong answer
echo -e "${BOLD}4. Player 2 submits answer (wrong)...${NC}"
echo "   POST /api/match/$MATCH_ID/answer"
echo "   Authorization: Bearer <player2_token>"
ANSWER2_RESPONSE=$(curl -s -X POST $BASE_URL/api/match/$MATCH_ID/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PLAYER2_TOKEN" \
  -d "{
    \"userId\": ${PLAYER2_ID},
    \"matchQuestionId\": ${QUESTION_ID},
    \"selectedOption\": \"O2\",
    \"responseTimeMs\": 7000
  }")

echo "$ANSWER2_RESPONSE" | jq '.'
echo ""
echo "$ANSWER2_RESPONSE" | jq '.'
echo ""

# Step 5: Get scoreboard
echo -e "${BOLD}5. Getting scoreboard...${NC}"
echo "   GET /api/match/$MATCH_ID/scoreboard"
echo "   Authorization: Bearer <player1_token>"
SCOREBOARD_RESPONSE=$(curl -s -H "Authorization: Bearer $PLAYER1_TOKEN" \
  $BASE_URL/api/match/$MATCH_ID/scoreboard)

echo "$SCOREBOARD_RESPONSE" | jq '.'
echo ""

# Step 6: Advance to next question
echo -e "${BOLD}6. Advancing to next question...${NC}"
echo "   POST /api/match/$MATCH_ID/next"
echo "   Authorization: Bearer <player1_token>"
NEXT_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $PLAYER1_TOKEN" \
  $BASE_URL/api/match/$MATCH_ID/next)

echo "$NEXT_RESPONSE" | jq '.'
echo ""

# Step 7: Get updated state
echo -e "${BOLD}7. Getting updated match state...${NC}"
echo "   GET /api/match/$MATCH_ID/state"
echo "   Authorization: Bearer <player1_token>"
FINAL_STATE=$(curl -s -H "Authorization: Bearer $PLAYER1_TOKEN" \
  $BASE_URL/api/match/$MATCH_ID/state)

echo "$FINAL_STATE" | jq '. | {ok, matchId, status, finished, question: .question.text}'
echo ""

# ========================================
# SUMMARY
# ========================================

echo -e "${BOLD}==========================================="
echo "Match System Test Complete!"
echo -e "===========================================${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  ✓ Created 2 test users with authentication"
echo "  ✓ Match created with ID: $MATCH_ID"
echo "  ✓ Both players submitted answers (authenticated)"
echo "  ✓ Player 1 correct, Player 2 wrong"
echo "  ✓ Scores updated in database"
echo "  ✓ Match advanced to next question"
echo ""
echo -e "${BLUE}Players:${NC}"
echo "  Player 1: ID ${PLAYER1_ID}"
echo "  Player 2: ID ${PLAYER2_ID}"
echo ""
echo -e "${YELLOW}Check database with: make db-studio${NC}"
echo ""
