#!/bin/bash

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Install PM2 globally if not installed
if ! command_exists pm2; then
  echo "Installing PM2 globally..."
  npm install -g pm2
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Ensure storage directory exists
mkdir -p storage/lovable

# Stop any existing PM2 processes for this project
pm2 stop radio-server radio-webapp >/dev/null 2>&1
pm2 delete radio-server radio-webapp >/dev/null 2>&1

# Start both applications using PM2
echo "Starting applications with PM2..."
pm2 start ecosystem.config.cjs

# Display status
echo "PM2 Status:"
pm2 status

echo "Applications started! You can:"
echo "- View logs with: pm2 logs"
echo "- Monitor with: pm2 monit"
echo "- Stop with: pm2 stop all"
echo "- Access the webapp at: http://localhost:5173"
echo "- Access the API at: http://localhost:8080" 