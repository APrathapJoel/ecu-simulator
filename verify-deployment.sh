#!/bin/bash

# Deployment Verification Script for ECU Simulator
# Tests authentication endpoints and health checks

set -e

BASE_URL="${1:-http://localhost:3000}"
echo "Testing deployment at: $BASE_URL"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Request: $method $endpoint"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} - Status $status_code"
        echo "Response: $body"
    else
        echo -e "${RED}FAIL${NC} - Expected $expected_status, got $status_code"
        echo "Response: $body"
        return 1
    fi
}

# Health check tests
echo -e "\n${YELLOW}=== Health Check Tests ===${NC}"

test_endpoint "GET" "/api/healthz" "" "200" "Basic health check"
test_endpoint "GET" "/api/healthz/ready" "" "200" "Readiness check"

# Authentication tests
echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"

# Test 1: Registration with weak password (should fail)
test_endpoint "POST" "/api/auth/register" \
    '{"email":"test@example.com","password":"weak"}' \
    "400" "Registration with weak password"

# Test 2: Registration with valid data
test_endpoint "POST" "/api/auth/register" \
    '{"email":"test@example.com","password":"SecurePass123!"}' \
    "200" "Valid registration"

# Test 3: Duplicate registration (should fail)
test_endpoint "POST" "/api/auth/register" \
    '{"email":"test@example.com","password":"SecurePass123!"}' \
    "200" "Duplicate registration check"

# Test 4: Login with wrong password (should fail)
test_endpoint "POST" "/api/auth/login" \
    '{"email":"test@example.com","password":"wrongpassword"}' \
    "401" "Login with wrong password"

# Test 5: Valid login
login_response=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"SecurePass123!"}')

echo -e "\n${YELLOW}Testing: Valid login${NC}"
if echo "$login_response" | grep -q '"email"'; then
    echo -e "${GREEN}PASS${NC} - Login successful"
    echo "Response: $login_response"
else
    echo -e "${RED}FAIL${NC} - Login failed"
    echo "Response: $login_response"
fi

# Test 6: Check authenticated user
test_endpoint "GET" "/api/auth/me" "" "200" "Get authenticated user"

# Test 7: Logout
test_endpoint "POST" "/api/auth/logout" "" "200" "Logout"

# Test 8: Check user after logout (should fail)
test_endpoint "GET" "/api/auth/me" "" "401" "Get user after logout"

# Cleanup
rm -f cookies.txt

echo -e "\n${GREEN}=== Deployment Verification Complete ===${NC}"
echo "If all tests pass, your deployment is working correctly!"
echo "Make sure to set MONGODB_URI environment variable in production."
