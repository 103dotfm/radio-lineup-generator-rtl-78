#!/bin/bash
# Script to test Google Calendar sync via API

set -e

BASE_URL="http://localhost:3000"
EMAIL="yaniv@103fm.co.il"
PASSWORD=$(grep ADMIN_PASSWORD .env 2>/dev/null | cut -d= -f2)

echo "=========================================="
echo "Google Calendar Sync Test"
echo "=========================================="
echo ""

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c /tmp/cookies.txt)

SESSION_ID=$(grep -o 'connect.sid=[^;]*' /tmp/cookies.txt | head -1 | cut -d= -f2)

if [ -z "$SESSION_ID" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✓ Logged in"
echo ""

# Step 2: Clear all Google Calendar bookings
echo "Step 2: Clearing all Google Calendar bookings..."
CLEAR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/studio-schedule-enhanced/sync/clear" \
  -H "Content-Type: application/json" \
  -b "connect.sid=$SESSION_ID" \
  -c /tmp/cookies.txt)

echo "$CLEAR_RESPONSE" | jq '.' 2>/dev/null || echo "$CLEAR_RESPONSE"
echo ""

# Step 3: Import from Google Calendar
echo "Step 3: Importing from Google Calendar..."
SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/studio-schedule-enhanced/sync/import" \
  -H "Content-Type: application/json" \
  -b "connect.sid=$SESSION_ID" \
  -c /tmp/cookies.txt)

echo "$SYNC_RESPONSE" | jq '.' 2>/dev/null || echo "$SYNC_RESPONSE"
echo ""

# Wait a bit for async processing
echo "Waiting 10 seconds for sync to complete..."
sleep 10
echo ""

# Step 4: Get today's bookings
echo "Step 4: Checking today's bookings..."
TODAY=$(date +%Y-%m-%d)
BOOKINGS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/studio-schedule-enhanced/bookings?start_date=$TODAY&end_date=$TODAY" \
  -H "Content-Type: application/json" \
  -b "connect.sid=$SESSION_ID" \
  -c /tmp/cookies.txt)

echo "$BOOKINGS_RESPONSE" | jq '.' 2>/dev/null || echo "$BOOKINGS_RESPONSE"
echo ""

echo "=========================================="
echo "Test completed"
echo "=========================================="
