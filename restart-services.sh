#!/bin/bash

echo "Restarting services for multi-URL support..."

# Stop all PM2 processes
echo "Stopping PM2 processes..."
pm2 stop all

# Reload nginx configuration
echo "Reloading nginx configuration..."
sudo nginx -t && sudo systemctl reload nginx

# Start PM2 processes with new configuration
echo "Starting PM2 processes..."
pm2 start ecosystem.config.cjs

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Show status
echo "PM2 status:"
pm2 status

echo "Services restarted successfully!"
echo ""
echo "Your website should now be accessible from:"
echo "- Local network: http://192.168.10.121"
echo "- Remote IP: http://212.179.162.102:8080"
echo "- Remote domain: http://logger.103.fm:8080" 