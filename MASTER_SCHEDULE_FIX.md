# Master Schedule Fix - Radio Lineup Generator

## Problem Analysis

The radio station's schedule system has two main components:

1. **Master Schedule** (Admin Panel): Weekly recurring shows that serve as templates
2. **Weekly Schedule** (Dashboard): Specific weekly schedules that can override master schedule data

### Current Issues

1. **Database Schema Missing Fields**: The `schedule_slots` table is missing crucial fields:
   - `is_master` - to distinguish between master and weekly schedules
   - `slot_date` - the actual date of the slot
   - `parent_slot_id` - to link weekly slots to their master slots
   - `is_deleted` - for soft deletion

2. **Weekly Schedule Not Inheriting from Master**: The weekly schedule is not properly showing master schedule slots

3. **Update Logic Issues**: Changes to master schedule are not properly affecting future weeks

## Solution

### Step 1: Database Schema Fix

Run the SQL script `fix_master_schedule.sql` to add the missing fields and update the database structure:

```sql
-- Add missing columns
ALTER TABLE schedule_slots 
ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slot_date DATE,
ADD COLUMN IF NOT EXISTS parent_slot_id UUID REFERENCES schedule_slots(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_master ON schedule_slots(is_master);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_slot_date ON schedule_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_parent_slot_id ON schedule_slots(parent_slot_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_deleted ON schedule_slots(is_deleted);

-- Update existing slots
UPDATE schedule_slots 
SET slot_date = date_trunc('week', CURRENT_DATE)::date + (day_of_week * interval '1 day')
WHERE slot_date IS NULL;

-- Mark existing slots as master slots
UPDATE schedule_slots 
SET is_master = true 
WHERE is_master IS NULL OR is_master = false;
```

### Step 2: Schedule Route Logic

The updated `server/routes/schedule.js` now properly handles:

1. **Master Schedule Fetching**: Only returns slots with `is_master = true`
2. **Weekly Schedule Fetching**: Returns a combination of:
   - Master slot instances for the week
   - Custom weekly slots (not related to master)
   - Master slots without instances (generated on-the-fly)

3. **Update Logic**:
   - **Master Schedule Updates**: Updates the master slot and all future instances
   - **Weekly Schedule Updates**: Only updates the specific instance, marks as modified if derived from master

### Step 3: Frontend Components

The frontend components already support the master schedule functionality:

- `MasterSchedule.tsx` - Admin panel component for managing master schedule
- `ScheduleView.tsx` - Generic schedule view that works for both master and weekly
- `ScheduleGrid.tsx` - Grid layout that adapts based on `isMasterSchedule` prop

## How It Works

### Master Schedule (Admin Panel)

1. **Location**: `/admin` → "לוח שידורים ראשי" tab
2. **Purpose**: Define weekly recurring shows
3. **Behavior**: 
   - Shows only master slots (`is_master = true`)
   - Changes affect all future weeks
   - Creates weekly instances automatically

### Weekly Schedule (Dashboard)

1. **Location**: Main dashboard page
2. **Purpose**: View and edit specific weekly schedules
3. **Behavior**:
   - Shows master slot instances for the week
   - Allows custom overrides
   - Changes don't affect master schedule

### Data Flow

```
Master Schedule (Admin)
    ↓ (creates instances)
Weekly Instances (Future weeks)
    ↓ (displayed in)
Weekly Schedule (Dashboard)
    ↓ (can be overridden)
Custom Weekly Slots
```

## Implementation Steps

1. **Run Database Fix**:
   ```bash
   # Connect to your database and run:
   psql -h localhost -U radiouser -d radiodb -f fix_master_schedule.sql
   ```

2. **Restart Application**:
   ```bash
   npm start
   ```

3. **Test Functionality**:
   - Go to `/admin` and check the "לוח שידורים ראשי" tab
   - Add some master schedule slots
   - Go to the main dashboard and verify weekly schedule shows the slots
   - Edit a weekly slot and verify it doesn't affect master schedule
   - Edit a master slot and verify it affects future weeks

## Key Features

### Master Schedule Features
- ✅ Add/Edit/Delete recurring shows
- ✅ Changes affect all future weeks
- ✅ Never affects past weeks
- ✅ Automatic weekly instance creation

### Weekly Schedule Features
- ✅ Inherits from master schedule
- ✅ Allows custom overrides
- ✅ Changes don't affect master schedule
- ✅ Shows both inherited and custom slots

### Data Integrity
- ✅ Soft deletion (no data loss)
- ✅ Proper parent-child relationships
- ✅ Modification tracking
- ✅ Future-only updates

## Troubleshooting

### If Weekly Schedule Shows No Slots
1. Check if master slots exist in admin panel
2. Verify database has the required fields
3. Check browser console for errors

### If Master Schedule Changes Don't Affect Weekly
1. Verify the update logic in schedule route
2. Check if weekly instances exist
3. Ensure `parent_slot_id` is properly set

### If Database Connection Fails
1. Check PostgreSQL service status
2. Verify connection credentials in `.env`
3. Ensure database exists and is accessible

## Files Modified

1. `fix_master_schedule.sql` - Database schema fix
2. `server/routes/schedule.js` - Updated API logic
3. `MASTER_SCHEDULE_FIX.md` - This documentation

## Next Steps

After implementing this fix:

1. **Test thoroughly** with real data
2. **Migrate existing data** if needed
3. **Train users** on the new master schedule functionality
4. **Monitor performance** and add indexes if needed
5. **Consider adding** bulk operations for master schedule management 