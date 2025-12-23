# Virtual Slot Edit Bug Fix

## Problem Summary

When users tried to edit slots from the weekly schedule that were inherited from the master schedule (virtual slots), the edit operation failed with the following errors:

1. **404 Error**: `PUT /api/schedule/slots/{id}` returned 404 (Not Found)
2. **500 Error**: Fallback create attempt failed with database constraint violation:
   ```
   new row for relation "schedule_slots" violates check constraint "check_slot_date_not_null_for_instances"
   ```

## Root Cause

The issue had two components:

### 1. Virtual Slots Don't Exist in Database
When viewing the weekly schedule, slots inherited from the master schedule are generated on-the-fly as "virtual slots" with randomly generated UUIDs. These slots don't actually exist in the database - they're created dynamically by the SQL query that combines actual weekly slots with master schedule slots.

### 2. Missing slot_date Calculation
When the frontend tried to edit a virtual slot:
- It would first attempt to UPDATE the slot using its virtual ID
- The backend would return 404 because that ID doesn't exist in the database
- The frontend would detect this and fall back to CREATE mode
- However, the create operation was failing because `slot_date` was not being properly calculated from the `selectedDate` and `day_of_week` parameters

The database has a constraint:
```sql
CHECK ((is_master = true) OR (slot_date IS NOT NULL))
```
This means that weekly slots (is_master=false) MUST have a slot_date, but the system wasn't providing it.

## Solution

### Backend Changes (server/routes/schedule.js)

#### 1. POST Endpoint Enhancement
Added logic to calculate `slot_date` when not provided:

```javascript
// Calculate slot_date if not provided (for weekly slots created from virtual slot edits)
let final_slot_date = slot_date;
if (!is_master && !final_slot_date && selectedDate && day_of_week !== undefined) {
  const selectedDateObj = new Date(selectedDate);
  const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 0 });
  const targetDate = addDays(weekStart, parseInt(day_of_week));
  final_slot_date = format(targetDate, 'yyyy-MM-dd');
  console.log(`Calculated slot_date from selectedDate and day_of_week: ${final_slot_date}`);
}
```

This ensures that when creating a weekly slot (including overrides from virtual slots), the system can calculate the correct `slot_date` based on:
- `selectedDate`: The date/week the user is viewing
- `day_of_week`: The day within that week (0=Sunday, 6=Saturday)

#### 2. PUT Endpoint Enhancement
Improved the PUT endpoint to automatically create override slots when editing virtual slots:

```javascript
if (!is_master && selectedDate && updates.day_of_week !== undefined) {
  console.log('Virtual slot detected - creating override slot for weekly schedule');
  
  // Calculate slot_date
  const selectedDateObj = new Date(selectedDate);
  const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 0 });
  const targetDate = addDays(weekStart, parseInt(updates.day_of_week));
  const calculated_slot_date = format(targetDate, 'yyyy-MM-dd');
  
  // Find parent master slot
  let parent_slot_id = updates.parent_slot_id;
  if (!parent_slot_id && updates.start_time && updates.day_of_week !== undefined) {
    const masterSlotQuery = await query(
      `SELECT id FROM schedule_slots 
       WHERE is_master = true 
       AND day_of_week = $1 
       AND start_time = $2 
       AND is_deleted = false`,
      [updates.day_of_week, updates.start_time]
    );
    
    if (masterSlotQuery.data && masterSlotQuery.data.length > 0) {
      parent_slot_id = masterSlotQuery.data[0].id;
    }
  }
  
  // Create the override slot
  const createResult = await query(/* INSERT statement */);
  return res.json(createResult.data[0]);
}
```

This allows the PUT endpoint to:
1. Detect when a virtual slot is being edited (slot ID doesn't exist in database)
2. Calculate the correct `slot_date` for the override
3. Find the parent master slot to maintain the relationship
4. Create a new weekly slot (override) with the updated values

## How It Works Now

### Editing a Virtual Slot (Master Schedule Inheritance)

1. User views weekly schedule and sees slots inherited from master schedule
2. User clicks to edit one of these virtual slots
3. Frontend sends PUT request with:
   - Virtual slot ID (doesn't exist in DB)
   - Updated slot data
   - `selectedDate` (the week being viewed)
   - `isMasterSchedule: false`
   
4. Backend receives request and tries to find slot by ID
5. Slot not found → Backend detects it's a virtual slot
6. Backend calculates the correct `slot_date` from `selectedDate` and `day_of_week`
7. Backend creates a new weekly slot as an override
8. The new slot "shadows" the master slot for that specific date
9. Future weeks still show the master slot, but this week shows the override

### Editing a Real Weekly Slot

1. User views weekly schedule and sees an existing weekly slot
2. User clicks to edit
3. Frontend sends PUT request with the slot ID
4. Backend finds the slot in the database
5. Backend updates the existing slot directly
6. Changes are saved and returned

## Database Constraint

The fix ensures compliance with the database constraint:
```sql
CONSTRAINT check_slot_date_not_null_for_instances 
CHECK ((is_master = true) OR (slot_date IS NOT NULL))
```

- Master slots (is_master=true): Have NULL slot_date (they're templates)
- Weekly slots (is_master=false): MUST have a specific slot_date
- Virtual slots: When edited, become real weekly slots with proper slot_date

## Testing

To test the fix:

1. **View Weekly Schedule**: Navigate to a week that has slots inherited from master schedule
2. **Edit Master-Inherited Slot**: Click edit on a slot that came from the master schedule
3. **Make Changes**: Modify the show name, time, or any other field
4. **Save**: Click save - the slot should save successfully
5. **Verify Override**: The edited slot should now show your changes
6. **Check Other Weeks**: Navigate to different weeks - they should still show the original master schedule slot
7. **Re-edit**: Try editing the same slot again - it should work without errors

## Notes

- Virtual slots are identified by checking if the slot ID exists in the database
- When a virtual slot is edited, it creates an "override" that only affects that specific week
- The override maintains a reference to the parent master slot via `parent_slot_id`
- This allows the system to know which master slot the override came from
- Deleting an override makes the master slot visible again for that week

## Files Modified

- `/home/iteam/radio-lineup-generator-rtl-78/server/routes/schedule.js`
  - Enhanced POST endpoint to calculate slot_date from selectedDate and day_of_week
  - Enhanced PUT endpoint to handle virtual slots by creating overrides

## Related Constraints

```sql
-- From database schema
CONSTRAINT check_slot_date_not_null_for_instances 
CHECK ((is_master = true) OR (slot_date IS NOT NULL))
```

Comment: "Master slots (is_master=true) can have NULL slot_date, but weekly instances must have a specific date"

