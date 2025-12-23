#!/bin/bash

# Set environment variables
export DB_TYPE=local
export NODE_ENV=production
export PORT=5174

# Start the server
node server/server.js --port $PORT --host 0.0.0.0 