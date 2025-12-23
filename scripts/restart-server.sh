#!/bin/bash

# Stop on any error
set -e

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"

echo "Stopping PM2 processes..."
pm2 stop all

echo "Deleting PM2 processes..."
pm2 delete all

echo "Clearing PM2 logs..."
pm2 flush

echo "Starting processes with new configuration..."
pm2 start ecosystem.config.cjs

echo "Server has been restarted!"
echo "You can check the logs with: pm2 logs" 