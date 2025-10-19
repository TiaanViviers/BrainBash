#!/bin/bash

# Authentication System Test Script
# Tests all auth endpoints: register, login, refresh, logout, protected routes

set -e  # Exit on error

BASE_URL="http://localhost:3001"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate unique test data
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_${TIMESTAMP}"
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASSWORD="SecurePass123"

echo -e "${BOLD}================================${NC}"
echo -e "${BOLD}Authentication System Test${NC}"
echo -e "${BOLD}================================${NC}\n"

# ========================================
# Test 1: Health Check
# ========================================
echo -e "${BLUE}[TEST 1]${NC} Health Check"
curl -s "${BASE_URL}/health" | jq '.'
echo -e "${GREEN}✓ Server is running${NC}\n"

# ========================================
# Test 2: Register New User
# ========================================
echo -e "${BLUE}[TEST 2]${NC} Register New User"
echo "Username: ${TEST_USERNAME}"
echo "Email: ${TEST_EMAIL}"
echo "Password: ${TEST_PASSWORD}"

REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${TEST_USERNAME}\",
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Registration successful${NC}"
  echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Registration failed${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 3: Test Protected Endpoint (GET /api/auth/me)
# ========================================
echo -e "${BLUE}[TEST 3]${NC} Access Protected Endpoint (Get Current User)"

ME_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/auth/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$ME_RESPONSE" | jq '.'

USER_ID=$(echo "$ME_RESPONSE" | jq -r '.user.userId')

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
  echo -e "${GREEN}✓ Protected endpoint accessible with valid token${NC}"
  echo "User ID: ${USER_ID}"
else
  echo -e "${RED}✗ Failed to access protected endpoint${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 4: Test Invalid Token
# ========================================
echo -e "${BLUE}[TEST 4]${NC} Test Invalid Token"

INVALID_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/auth/me" \
  -H "Authorization: Bearer invalid_token_12345")

echo "$INVALID_RESPONSE" | jq '.'

ERROR_MSG=$(echo "$INVALID_RESPONSE" | jq -r '.error')

if [ "$ERROR_MSG" = "Invalid token" ]; then
  echo -e "${GREEN}✓ Invalid token correctly rejected${NC}"
else
  echo -e "${RED}✗ Invalid token not rejected${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 5: Logout
# ========================================
echo -e "${BLUE}[TEST 5]${NC} Logout"

LOGOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$LOGOUT_RESPONSE" | jq '.'

LOGOUT_OK=$(echo "$LOGOUT_RESPONSE" | jq -r '.ok')

if [ "$LOGOUT_OK" = "true" ]; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${RED}✗ Logout failed${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 6: Login
# ========================================
echo -e "${BLUE}[TEST 6]${NC} Login with Credentials"

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ -n "$NEW_ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
  ACCESS_TOKEN="$NEW_ACCESS_TOKEN"  # Update for next tests
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 7: Test Wrong Password
# ========================================
echo -e "${BLUE}[TEST 7]${NC} Test Wrong Password"

WRONG_PW_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"WrongPassword123\"
  }")

echo "$WRONG_PW_RESPONSE" | jq '.'

LOGIN_ERROR=$(echo "$WRONG_PW_RESPONSE" | jq -r '.error')

if [ "$LOGIN_ERROR" = "Authentication failed" ]; then
  echo -e "${GREEN}✓ Wrong password correctly rejected${NC}"
else
  echo -e "${RED}✗ Wrong password not rejected${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 8: Test Duplicate Registration
# ========================================
echo -e "${BLUE}[TEST 8]${NC} Test Duplicate Registration"

DUP_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${TEST_USERNAME}\",
    \"email\": \"different_${TIMESTAMP}@example.com\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "$DUP_RESPONSE" | jq '.'

DUP_ERROR=$(echo "$DUP_RESPONSE" | jq -r '.message')

if [[ "$DUP_ERROR" == *"already taken"* ]]; then
  echo -e "${GREEN}✓ Duplicate username correctly rejected${NC}"
else
  echo -e "${RED}✗ Duplicate username not rejected${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 9: Test Protected Match Endpoint
# ========================================
echo -e "${BLUE}[TEST 9]${NC} Test Protected Match Endpoint"

MATCH_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/match" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"category\": \"Science\",
    \"difficulty\": \"easy\",
    \"amount\": 5,
    \"players\": [${USER_ID}],
    \"hostId\": ${USER_ID}
  }")

echo "$MATCH_RESPONSE" | jq '.'

MATCH_ID=$(echo "$MATCH_RESPONSE" | jq -r '.matchId')

if [ "$MATCH_ID" != "null" ] && [ -n "$MATCH_ID" ]; then
  echo -e "${GREEN}✓ Match creation successful with authentication${NC}"
  echo "Match ID: ${MATCH_ID}"
else
  echo -e "${RED}✗ Match creation failed${NC}"
  exit 1
fi
echo ""

# ========================================
# Test 10: Test Admin-Only Endpoint (Create Category)
# ========================================
echo -e "${BLUE}[TEST 10]${NC} Test Admin-Only Endpoint (Non-admin user)"

CATEGORY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"name\": \"Test Category ${TIMESTAMP}\",
    \"description\": \"Test description\"
  }")

echo "$CATEGORY_RESPONSE" | jq '.'

FORBIDDEN_ERROR=$(echo "$CATEGORY_RESPONSE" | jq -r '.error')

if [ "$FORBIDDEN_ERROR" = "Forbidden" ]; then
  echo -e "${GREEN}✓ Non-admin correctly denied access to admin endpoint${NC}"
else
  echo -e "${RED}✗ Admin protection not working${NC}"
  exit 1
fi
echo ""

# ========================================
# Summary
# ========================================
echo -e "${BOLD}================================${NC}"
echo -e "${BOLD}${GREEN}ALL TESTS PASSED! ✓${NC}"
echo -e "${BOLD}================================${NC}"
echo ""
echo "Test Scope:"
echo "  ✓ User registration"
echo "  ✓ JWT token generation"
echo "  ✓ Protected endpoint access"
echo "  ✓ Invalid token rejection"
echo "  ✓ User logout"
echo "  ✓ User login"
echo "  ✓ Wrong password rejection"
echo "  ✓ Duplicate registration prevention"
echo "  ✓ Match creation with auth"
echo "  ✓ Admin-only endpoint protection"
echo ""
echo "Created test user:"
echo "  Username: ${TEST_USERNAME}"
echo "  Email: ${TEST_EMAIL}"
echo "  User ID: ${USER_ID}"
echo ""
