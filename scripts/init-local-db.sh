#!/bin/bash

# Stop on any error
set -e

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"

echo "Initializing local database..."

# Create database and user
sudo -u postgres psql << EOF
  DROP DATABASE IF EXISTS radiodb;
  DROP USER IF EXISTS radiouser;
  CREATE USER radiouser WITH PASSWORD 'radio123';
  CREATE DATABASE radiodb OWNER radiouser;
  \c radiodb
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

echo "Database and user created successfully"

# Apply schema
echo "Applying database schema..."
PGPASSWORD=radio123 psql -h localhost -U radiouser -d radiodb -f "${PROJECT_ROOT}/database/schema.sql"

echo "Schema applied successfully"

# Set environment variables
echo "Setting up environment variables..."
cat > "${PROJECT_ROOT}/.env" << EOF
DB_TYPE=local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=radiodb
DB_USER=radiouser
DB_PASSWORD=radio123
NODE_ENV=development
EOF

# Stop PM2 processes
echo "Stopping PM2 processes..."
pm2 stop all

# Delete the old PM2 processes
echo "Deleting old PM2 processes..."
pm2 delete all

# Start the processes with new configuration
echo "Starting processes with new configuration..."
pm2 start ecosystem.config.cjs

echo "Local database initialization complete!"
echo "The application has been restarted with the new configuration." 