#!/bin/bash

echo "=== RDS Telnet Cron Job Monitor ==="
echo "Current time: $(date)"
echo ""

# Check if radio-api service is running
echo "1. Checking PM2 service status..."
pm2 status | grep radio-api
echo ""

# Check recent transmission logs
echo "2. Recent RDS transmission logs (last 5):"
curl -s http://localhost:5174/api/rds/transmission-logs | jq '.logs[0:5] | .[] | {time: .transmission_time, success: .success, message: .message}' 2>/dev/null || echo "Failed to get logs"
echo ""

# Check when next cron should run
echo "3. Next expected cron runs:"
current_minute=$(date +%M)
current_hour=$(date +%H)

if [ $current_minute -lt 30 ]; then
    next_run="${current_hour}:30"
    next_run_after=$((30 - current_minute))
else
    next_hour=$((current_hour + 1))
    if [ $next_hour -eq 24 ]; then
        next_hour=0
    fi
    next_run="${next_hour}:00"
    next_run_after=$((60 - current_minute))
fi

echo "Next run: ${next_run} (in ${next_run_after} minutes)"
echo ""

# Test manual transmission
echo "4. Testing manual transmission..."
curl -s -X POST http://localhost:5174/api/rds/send-via-telnet | jq '{success: .success, message: .message}' 2>/dev/null || echo "Failed to test transmission"
echo ""

echo "=== Monitor Complete ==="


