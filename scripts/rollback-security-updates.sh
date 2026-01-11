#!/bin/bash

# Rollback script for security updates
# This script restores the system to the state before security updates

set -e

PROJECT_ROOT="/home/iteam/radio-lineup-generator-rtl-78"
BACKUP_DIR="$PROJECT_ROOT/backup"
STATE_FILE="$BACKUP_DIR/pre-update-state.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_status() {
    echo -e "ℹ $1"
}

cd "$PROJECT_ROOT" || {
    print_error "Failed to navigate to project directory: $PROJECT_ROOT"
    exit 1
}

echo ""
echo "=========================================="
echo "  Security Updates Rollback Script"
echo "=========================================="
echo ""

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
    print_error "State file not found: $STATE_FILE"
    print_warning "Cannot determine pre-update state. Manual rollback required."
    exit 1
fi

# Read state
source "$STATE_FILE"
print_status "Pre-update state:"
echo "  - Git commit: $GIT_COMMIT_HASH"
echo "  - Git branch: $GIT_BRANCH"
echo "  - Timestamp: $TIMESTAMP"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with rollback? This will restore package.json, package-lock.json, and git state. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Rollback cancelled by user"
    exit 0
fi

# Step 1: Restore package.json and package-lock.json
print_status "Step 1: Restoring package files..."

PACKAGE_BACKUP=$(ls -1t "$BACKUP_DIR"/package.json.backup-* 2>/dev/null | head -1)
LOCKFILE_BACKUP=$(ls -1t "$BACKUP_DIR"/package-lock.json.backup-* 2>/dev/null | head -1)

if [ -f "$PACKAGE_BACKUP" ]; then
    cp "$PACKAGE_BACKUP" "$PROJECT_ROOT/package.json"
    print_success "Restored package.json from $(basename $PACKAGE_BACKUP)"
else
    print_error "package.json backup not found"
    exit 1
fi

if [ -f "$LOCKFILE_BACKUP" ]; then
    cp "$LOCKFILE_BACKUP" "$PROJECT_ROOT/package-lock.json"
    print_success "Restored package-lock.json from $(basename $LOCKFILE_BACKUP)"
else
    print_warning "package-lock.json backup not found (will be regenerated)"
fi

# Step 2: Reinstall packages
print_status "Step 2: Reinstalling packages..."
if npm install; then
    print_success "Packages reinstalled successfully"
else
    print_error "Failed to reinstall packages"
    exit 1
fi

# Step 3: Restore git state (optional, ask user)
echo ""
read -p "Do you want to restore git commit state? This will reset to commit $GIT_COMMIT_HASH (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Step 3: Restoring git state..."
    if git checkout "$GIT_COMMIT_HASH"; then
        print_success "Git state restored to commit $GIT_COMMIT_HASH"
        print_warning "You are now in detached HEAD state. Consider: git checkout $GIT_BRANCH"
    else
        print_error "Failed to restore git state"
        exit 1
    fi
else
    print_warning "Skipping git state restoration"
fi

# Step 4: Database restore (optional, ask user)
echo ""
read -p "Do you want to restore database from backup? This will overwrite current database! (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DB_BACKUP=$(ls -1t "$BACKUP_DIR"/radiodb-backup-before-security-updates-*.sql 2>/dev/null | head -1)
    if [ -f "$DB_BACKUP" ]; then
        print_status "Step 4: Restoring database..."
        print_warning "Stopping PM2 processes..."
        pm2 stop all || true
        
        print_status "Restoring database from $(basename $DB_BACKUP)..."
        if PGPASSWORD="radio123" psql -h localhost -U radiouser -d radiodb < "$DB_BACKUP"; then
            print_success "Database restored successfully"
        else
            print_error "Failed to restore database"
            pm2 start all || true
            exit 1
        fi
        
        print_status "Restarting PM2 processes..."
        pm2 start all || true
    else
        print_error "Database backup not found"
    fi
else
    print_warning "Skipping database restoration"
fi

# Step 5: Restart services
print_status "Step 5: Restarting PM2 processes..."
if pm2 restart all; then
    print_success "PM2 processes restarted"
else
    print_warning "PM2 restart failed, attempting start..."
    pm2 start all || true
fi

echo ""
echo "=========================================="
print_success "Rollback completed successfully!"
echo "=========================================="
echo ""
print_status "Summary:"
echo "  - Package files restored"
echo "  - Packages reinstalled"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  - Git state restored"
fi
echo "  - PM2 processes restarted"
echo ""
print_warning "If database was restored, verify data integrity"
echo ""
