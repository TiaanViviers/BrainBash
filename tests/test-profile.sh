#!/bin/bash
# Profile Endpoints Test Script

BASE_URL="http://localhost:3001"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BOLD}╔══════════════════════════════════════════╗"
echo "║      PROFILE ENDPOINTS TEST              ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking server status...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ Server is not running at $BASE_URL${NC}"
  echo -e "${YELLOW}  Please start the server with: npm run dev${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Register a test user
echo -e "${BOLD}=== SETUP: Creating Test User ===${NC}"
echo ""

TIMESTAMP=$(date +%s)
TEST_EMAIL="profile_test_${TIMESTAMP}@test.com"
TEST_PASS="TestPass123"
TEST_USER="tester_${TIMESTAMP: -6}"

USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${TEST_USER}\",
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASS}\"
  }")

TOKEN=$(echo "$USER_RESPONSE" | jq -r '.accessToken')
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.user.userId')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to register test user${NC}"
  echo "$USER_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Test user created (ID: ${USER_ID})${NC}"
echo ""

# Test 1: GET Profile
echo -e "${BOLD}=== TEST 1: GET /api/users/me/profile ===${NC}"
echo ""

PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/me/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "$PROFILE_RESPONSE" | jq '.'
echo ""

PROFILE_OK=$(echo "$PROFILE_RESPONSE" | jq -r '.ok')
if [ "$PROFILE_OK" = "true" ]; then
  echo -e "${GREEN}✓ PASS: Profile retrieved successfully${NC}"
  
  # Check if profile contains expected fields
  USERNAME=$(echo "$PROFILE_RESPONSE" | jq -r '.profile.username')
  EMAIL=$(echo "$PROFILE_RESPONSE" | jq -r '.profile.email')
  MEMBER_SINCE=$(echo "$PROFILE_RESPONSE" | jq -r '.profile.memberSince')
  
  echo -e "${CYAN}  Username: ${USERNAME}${NC}"
  echo -e "${CYAN}  Email: ${EMAIL}${NC}"
  echo -e "${CYAN}  Member Since: ${MEMBER_SINCE}${NC}"
else
  echo -e "${RED}✗ FAIL: Failed to get profile${NC}"
fi
echo ""

# Test 2: Update Profile (Username)
echo -e "${BOLD}=== TEST 2: PATCH /api/users/me/profile (Update Username) ===${NC}"
echo ""

NEW_USERNAME="updated_${TEST_USER}"
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/users/me/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"username\": \"${NEW_USERNAME}\"
  }")

echo "$UPDATE_RESPONSE" | jq '.'
echo ""

UPDATE_OK=$(echo "$UPDATE_RESPONSE" | jq -r '.ok')
UPDATED_USERNAME=$(echo "$UPDATE_RESPONSE" | jq -r '.profile.username')

if [ "$UPDATE_OK" = "true" ] && [ "$UPDATED_USERNAME" = "$NEW_USERNAME" ]; then
  echo -e "${GREEN}✓ PASS: Username updated successfully${NC}"
else
  echo -e "${RED}✗ FAIL: Failed to update username${NC}"
fi
echo ""

# Test 3: Update Profile (Avatar URL)
echo -e "${BOLD}=== TEST 3: PATCH /api/users/me/profile (Update Avatar) ===${NC}"
echo ""

AVATAR_ID="bubbles"
AVATAR_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/users/me/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"avatarId\": \"${AVATAR_ID}\"
  }")

echo "$AVATAR_RESPONSE" | jq '.'
echo ""

AVATAR_OK=$(echo "$AVATAR_RESPONSE" | jq -r '.ok')
UPDATED_AVATAR=$(echo "$AVATAR_RESPONSE" | jq -r '.profile.avatarUrl')

if [ "$AVATAR_OK" = "true" ] && [ "$UPDATED_AVATAR" = "$AVATAR_ID" ]; then
  echo -e "${GREEN}✓ PASS: Avatar updated successfully${NC}"
else
  echo -e "${RED}✗ FAIL: Failed to update avatar${NC}"
fi
echo ""

# Test 4: Change Password
echo -e "${BOLD}=== TEST 4: PATCH /api/users/me/profile (Change Password) ===${NC}"
echo ""

NEW_PASS="NewTestPass456"
PASSWORD_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/users/me/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"currentPassword\": \"${TEST_PASS}\",
    \"newPassword\": \"${NEW_PASS}\"
  }")

echo "$PASSWORD_RESPONSE" | jq '.'
echo ""

PASSWORD_OK=$(echo "$PASSWORD_RESPONSE" | jq -r '.ok')

if [ "$PASSWORD_OK" = "true" ]; then
  echo -e "${GREEN}✓ PASS: Password changed successfully${NC}"
  
  # Verify new password works by logging in
  echo -e "${CYAN}  Verifying new password with login...${NC}"
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${TEST_EMAIL}\",
      \"password\": \"${NEW_PASS}\"
    }")
  
  LOGIN_OK=$(echo "$LOGIN_RESPONSE" | jq -r '.ok')
  if [ "$LOGIN_OK" = "true" ]; then
    echo -e "${GREEN}  ✓ New password verified${NC}"
  else
    echo -e "${RED}  ✗ New password verification failed${NC}"
  fi
else
  echo -e "${RED}✗ FAIL: Failed to change password${NC}"
fi
echo ""

# Test 5: Get Match History (empty)
echo -e "${BOLD}=== TEST 5: GET /api/users/me/matches ===${NC}"
echo ""

MATCHES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/me/matches?limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$MATCHES_RESPONSE" | jq '.'
echo ""

MATCHES_OK=$(echo "$MATCHES_RESPONSE" | jq -r '.ok')
MATCH_COUNT=$(echo "$MATCHES_RESPONSE" | jq -r '.count')

if [ "$MATCHES_OK" = "true" ]; then
  echo -e "${GREEN}✓ PASS: Match history retrieved (${MATCH_COUNT} matches)${NC}"
else
  echo -e "${RED}✗ FAIL: Failed to get match history${NC}"
fi
echo ""

# Test 6: Delete Account
echo -e "${BOLD}=== TEST 6: DELETE /api/users/me/account ===${NC}"
echo ""

DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/users/me/account" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"password\": \"${NEW_PASS}\"
  }")

echo "$DELETE_RESPONSE" | jq '.'
echo ""

DELETE_OK=$(echo "$DELETE_RESPONSE" | jq -r '.ok')

if [ "$DELETE_OK" = "true" ]; then
  echo -e "${GREEN}✓ PASS: Account deleted successfully${NC}"
  
  # Verify account is anonymized
  echo -e "${CYAN}  Verifying account anonymization...${NC}"
  VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/${USER_ID}")
  VERIFIED_USERNAME=$(echo "$VERIFY_RESPONSE" | jq -r '.user.username')
  
  if [[ "$VERIFIED_USERNAME" == "Deleted User "* ]]; then
    echo -e "${GREEN}  ✓ Account successfully anonymized${NC}"
  else
    echo -e "${YELLOW}  ! Username: ${VERIFIED_USERNAME}${NC}"
  fi
else
  echo -e "${RED}✗ FAIL: Failed to delete account${NC}"
fi
echo ""

# Summary
echo -e "${BOLD}╔══════════════════════════════════════════╗"
echo "║            TEST SUMMARY                  ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}All profile endpoints have been tested!${NC}"
echo -e "${CYAN}Test user ID: ${USER_ID}${NC}"
echo ""
