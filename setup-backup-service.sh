#!/bin/bash

# Setup script for Radio Lineup Generator Backup Service
# This script installs the systemd service for automatic backup functionality

set -e

echo "Setting up Radio Lineup Generator Backup Service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)"
    exit 1
fi

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Project directory: $PROJECT_DIR"

# Copy the service file to systemd directory
echo "Installing systemd service..."
cp "$SCRIPT_DIR/radio-lineup-cron.service" /etc/systemd/system/

# Update the service file with the correct working directory
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT_DIR|g" /etc/systemd/system/radio-lineup-cron.service

# Reload systemd daemon
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service to start on boot
echo "Enabling service to start on boot..."
systemctl enable radio-lineup-cron.service

# Start the service
echo "Starting the service..."
systemctl start radio-lineup-cron.service

# Check service status
echo "Checking service status..."
systemctl status radio-lineup-cron.service --no-pager

echo ""
echo "Backup service setup completed!"
echo ""
echo "Service commands:"
echo "  Check status: sudo systemctl status radio-lineup-cron.service"
echo "  Start service: sudo systemctl start radio-lineup-cron.service"
echo "  Stop service: sudo systemctl stop radio-lineup-cron.service"
echo "  Restart service: sudo systemctl restart radio-lineup-cron.service"
echo "  View logs: sudo journalctl -u radio-lineup-cron.service -f"
echo ""
echo "The service will automatically:"
echo "  - Start when the server boots"
echo "  - Create database backups daily at 23:00"
echo "  - Keep only the latest 30 backup files"
echo "  - Restart automatically if it crashes"
