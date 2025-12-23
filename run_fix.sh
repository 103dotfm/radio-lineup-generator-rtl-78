#!/bin/bash

# Fix Master Schedule Database Script
# This script runs the SQL fix to add missing fields and update the database structure

echo "Starting master schedule database fix..."

# Check if we can connect to the database
echo "Testing database connection..."
PGPASSWORD=radio123 psql -h localhost -U radiouser -d radiodb -c "SELECT 'Database connection successful' as status;" || {
    echo "Error: Cannot connect to database. Please check your database configuration."
    exit 1
}

echo "Running master schedule fix..."
PGPASSWORD=radio123 psql -h localhost -U radiouser -d radiodb -f fix_master_schedule.sql

if [ $? -eq 0 ]; then
    echo "✅ Master schedule database fix completed successfully!"
    echo ""
    echo "The following changes were made:"
    echo "1. Added missing fields: is_master, slot_date, parent_slot_id, is_deleted"
    echo "2. Created indexes for better performance"
    echo "3. Updated existing slots to have proper slot_date"
    echo "4. Marked existing slots as master slots"
    echo "5. Created weekly instances for existing master slots"
    echo ""
    echo "You can now use the master schedule functionality in the admin panel."
else
    echo "❌ Error running master schedule fix. Please check the error messages above."
    exit 1
fi 