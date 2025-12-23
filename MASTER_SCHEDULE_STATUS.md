# Master Schedule Implementation Status

## Overview
The master schedule functionality has been implemented to allow editing of weekly recurring shows in the admin section, with those changes affecting current and future weeks but not past weeks. The weekly schedule should show inherited slots from the master schedule.

## Current Implementation Status

### ✅ Completed Components

1. **Database Schema Updates**
   - Added `is_master` boolean field to distinguish master vs weekly slots
   - Added `slot_date` date field for specific dates
   - Added `parent_slot_id` UUID field to link weekly instances to master slots
   - Added `is_deleted` boolean field for soft deletion

2. **Backend API Routes** (`server/routes/schedule.js`)
   - Updated GET `/slots` to handle both master and weekly schedules
   - Master schedule: Returns only `is_master = true` slots
   - Weekly schedule: Returns slots for specific week with inheritance from master
   - Complex query that generates temporary instances for master slots without weekly instances

3. **Frontend Components**
   - Updated schedule hooks to handle master vs weekly schedules
   - Admin panel supports master schedule editing
   - Main dashboard supports weekly schedule editing

### 🔧 Key Implementation Details

#### Weekly Schedule Query Logic
The weekly schedule query uses a complex CTE (Common Table Expression) that:

1. **Gets existing weekly slots** (`week_slots`) - actual slots for the specific week
2. **Gets master slots** (`master_slots`) - all master schedule slots
3. **Generates temporary instances** (`master_instances_for_week`) - creates virtual instances for master slots that don't have actual weekly instances yet
4. **Combines results** - merges existing weekly slots with generated master instances

#### Master Schedule Inheritance
- Master slots are marked with `is_master = true`
- Weekly instances have `is_master = false` and `parent_slot_id` pointing to the master slot
- When viewing weekly schedule, master slots without instances are generated on-the-fly
- When editing weekly schedule, changes create actual weekly instances

### ⚠️ Potential Issues to Check

1. **Database Migration Status**
   - Verify all required columns exist: `is_master`, `slot_date`, `parent_slot_id`, `is_deleted`
   - Check if existing data has been properly migrated

2. **Data Consistency**
   - Ensure master slots have proper `day_of_week` values (0-6)
   - Verify weekly instances have correct `parent_slot_id` references
   - Check that `slot_date` values are properly set

3. **Query Performance**
   - The weekly schedule query is complex and may need optimization
   - Consider adding database indexes for better performance

4. **Frontend Logic**
   - Verify the frontend is correctly passing `isMasterSchedule` parameter
   - Check that the schedule hooks are properly handling both modes

## Testing Steps

### 1. Database Verification
```bash
# Check if required columns exist
psql -U iteam -d radio_lineup -c "\d schedule_slots"

# Check current data counts
psql -U iteam -d radio_lineup -c "
SELECT 'Master slots' as type, COUNT(*) as count FROM schedule_slots WHERE is_master = true
UNION ALL
SELECT 'Weekly instances' as type, COUNT(*) as count FROM schedule_slots WHERE is_master = false AND parent_slot_id IS NOT NULL
UNION ALL
SELECT 'Custom weekly slots' as type, COUNT(*) as count FROM schedule_slots WHERE is_master = false AND parent_slot_id IS NULL;
"
```

### 2. API Testing
```bash
# Test master schedule API
curl "http://localhost:3000/api/schedule/slots?isMasterSchedule=true"

# Test weekly schedule API
curl "http://localhost:3000/api/schedule/slots?selectedDate=2024-12-16&isMasterSchedule=false"
```

### 3. Frontend Testing
1. Go to admin panel and create/edit master schedule slots
2. Check that changes appear in the weekly schedule view
3. Verify that weekly schedule edits don't affect master schedule
4. Test that master schedule changes affect future weeks only

## Troubleshooting

### If Master Schedule Not Appearing in Weekly View

1. **Check Database Structure**
   ```sql
   -- Verify required columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'schedule_slots' 
   AND column_name IN ('is_master', 'slot_date', 'parent_slot_id', 'is_deleted');
   ```

2. **Check Master Slot Data**
   ```sql
   -- Verify master slots exist and have proper day_of_week
   SELECT id, show_name, day_of_week, is_master 
   FROM schedule_slots 
   WHERE is_master = true;
   ```

3. **Check Weekly Schedule Query**
   - Test the complex query manually in PostgreSQL
   - Verify it returns expected results for the current week

4. **Check Frontend Parameters**
   - Ensure `isMasterSchedule` parameter is being passed correctly
   - Verify `selectedDate` is in correct format

### If Changes Not Persisting

1. **Check API Routes**
   - Verify POST/PUT/DELETE routes handle master vs weekly correctly
   - Check that weekly instances are created when editing master slots

2. **Check Database Constraints**
   - Ensure foreign key constraints are properly set
   - Verify unique constraints don't conflict

## Next Steps

1. **Run Verification Script**
   ```bash
   node verify_and_fix.js
   ```

2. **Restart Application**
   ```bash
   pm2 restart all
   ```

3. **Test Functionality**
   - Create master schedule slots in admin panel
   - Verify they appear in weekly schedule
   - Test editing both master and weekly schedules
   - Confirm inheritance works correctly

4. **Monitor Performance**
   - Check query execution times
   - Add database indexes if needed
   - Optimize complex queries if necessary

## Files Modified

- `server/routes/schedule.js` - Updated API routes for master schedule
- `src/components/schedule/hooks/useScheduleSlots.ts` - Updated frontend hooks
- `src/lib/api/schedule.ts` - Updated API layer
- Database schema - Added required columns and indexes

## Expected Behavior

1. **Master Schedule (Admin Panel)**
   - Shows only master slots (`is_master = true`)
   - Changes affect current and future weeks
   - Past weeks remain unchanged

2. **Weekly Schedule (Main Dashboard)**
   - Shows slots for specific week
   - Includes inherited slots from master schedule
   - Allows custom overrides for specific weeks
   - Changes don't affect master schedule

3. **Inheritance Logic**
   - Master slots automatically appear in weekly view
   - Weekly edits create actual instances, not virtual ones
   - Master changes propagate to future weeks only 