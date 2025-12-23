#!/bin/bash

# RDS Cron Restart Script
# This script is called by system cron every morning at 6 AM to restart the RDS telnet cron job
# This ensures the cron job continues working 24/7 even if it stops during the night

# Set the working directory
cd /home/iteam/radio-lineup-generator-rtl-78

# Log the restart attempt
echo "$(date): [RDS CRON RESTART] Starting daily RDS cron restart procedure" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo "$(date): [RDS CRON RESTART] ERROR: PM2 not found" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    exit 1
fi

# Check if radio-api is running
if ! pm2 list | grep -q "radio-api"; then
    echo "$(date): [RDS CRON RESTART] ERROR: radio-api not found in PM2" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    exit 1
fi

# Restart the radio-api service to refresh the cron jobs
echo "$(date): [RDS CRON RESTART] Restarting radio-api service..." >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
pm2 restart radio-api

# Wait a moment for the service to restart
sleep 5

# Check if the service is running
if pm2 list | grep "radio-api" | grep -q "online"; then
    echo "$(date): [RDS CRON RESTART] SUCCESS: radio-api restarted successfully" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    
    # Trigger an immediate RDS transmission to verify everything is working
    echo "$(date): [RDS CRON RESTART] Triggering immediate RDS transmission test..." >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    
    # Wait a bit more for the service to fully initialize
    sleep 10
    
    # Test the RDS transmission
    curl -X POST http://localhost:5174/api/rds/send-via-telnet -m 30 > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "$(date): [RDS CRON RESTART] SUCCESS: RDS transmission test completed" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    else
        echo "$(date): [RDS CRON RESTART] WARNING: RDS transmission test failed" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    fi
else
    echo "$(date): [RDS CRON RESTART] ERROR: radio-api failed to restart" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
    exit 1
fi

echo "$(date): [RDS CRON RESTART] Daily restart procedure completed" >> /home/iteam/radio-lineup-generator-rtl-78/logs/rds-cron-restart.log
