#!/bin/bash

# Rollback script for security updates
# This script restores the application to the state before security updates

set -e

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"

echo "=== Security Updates Rollback Script ==="
echo ""

# Get the backup timestamp from the latest backup file
LATEST_BACKUP=$(ls -t backup/package.json.before-security-updates-* 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: No backup files found!"
    exit 1
fi

BACKUP_TIMESTAMP=$(basename "$LATEST_BACKUP" | sed 's/package.json.before-security-updates-//')
echo "Found backup from: $BACKUP_TIMESTAMP"
echo ""

# Restore package.json and package-lock.json
echo "Restoring package.json and package-lock.json..."
cp "backup/package.json.before-security-updates-$BACKUP_TIMESTAMP" package.json
cp "backup/package-lock.json.before-security-updates-$BACKUP_TIMESTAMP" package-lock.json
echo "✓ Package files restored"
echo ""

# Reinstall dependencies
echo "Reinstalling dependencies..."
npm install --legacy-peer-deps
echo "✓ Dependencies reinstalled"
echo ""

# Optionally restore database (commented out by default)
# Uncomment if database restore is needed
# echo "Restoring database..."
# pm2 stop all
# PGPASSWORD="radio123" psql -h localhost -U radiouser -d radiodb < \
#   "backup/radiodb-backup-before-security-updates-${BACKUP_TIMESTAMP//_/-}.sql"
# pm2 start all
# echo "✓ Database restored"
# echo ""

# Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 restart all
echo "✓ PM2 processes restarted"
echo ""

echo "=== Rollback Complete ==="
echo "Application has been restored to the state before security updates."
