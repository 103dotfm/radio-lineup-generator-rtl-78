# RDS Module Fix Guide

## Problem Summary

The RDS module was showing empty `rt1` values because:
1. Holiday/special programming slots weren't being saved properly from the UI
2. The UI form was calculating `day_of_week` incorrectly for weekly slots
3. Missing validation for RDS fields
4. No easy way to create holiday slots with proper RDS data

## Solutions Implemented

### 1. Fixed UI Form (ScheduleSlotForm.tsx)

**Problem**: The form was using `selectedDays[0]` for `day_of_week` instead of calculating it from the actual `selectedDate`.

**Fix**: Updated the form to calculate `day_of_week` from `selectedDate` for weekly schedule slots:

```typescript
// Before (incorrect):
day_of_week: selectedDays.length > 0 ? selectedDays[0] : 0,
slot_date: format(startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),

// After (correct):
const actualSelectedDate = selectedDate || new Date();
const calculatedDayOfWeek = actualSelectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
day_of_week: calculatedDayOfWeek,
slot_date: format(actualSelectedDate, 'yyyy-MM-dd'), // Use the actual selected date, not week start
```

### 2. Added RDS Field Validation (schedule.js)

**Problem**: No validation to ensure RDS fields are populated.

**Fix**: Added logging and validation for RDS fields:

```javascript
// Validate RDS fields for better RDS module integration
if (!rds_radio_text && !rds_radio_text_translated) {
  console.warn('Warning: No RDS radio text provided for slot. RDS module may show empty data.');
}
```

### 3. Created Holiday Slot Creation Script

**Problem**: No easy way to create holiday slots with proper RDS data.

**Solution**: Created `server/scripts/create-holiday-slot.js` with the following features:

- Command-line interface for creating holiday slots
- Automatic `day_of_week` calculation from date
- Proper RDS field configuration
- Conflict detection with existing slots
- Dry-run mode for testing
- Comprehensive help and validation

#### Usage Examples:

```bash
# Create a holiday music slot for Rosh Hashanah
node server/scripts/create-holiday-slot.js \
  --date 2025-09-23 \
  --show-name "מוזיקה לחג" \
  --host-name "עורך: יואב חנני" \
  --rds-text "Welcome new year! The best Israeli music, edited by Yoav Hanani"

# Create a Yom Kippur slot
node server/scripts/create-holiday-slot.js \
  --date 2025-10-02 \
  --show-name "מוזיקה ליום הכיפורים" \
  --rds-text "Gmar Hatima Tova! Israeli music for Yom Kippur"

# Test with dry-run first
node server/scripts/create-holiday-slot.js \
  --date 2025-10-02 \
  --show-name "Test Holiday" \
  --dry-run
```

## How to Use for Future Holiday Slots

### Method 1: Use the UI (Recommended for regular slots)

1. Open the schedule view for the holiday date
2. Click "Add Slot" 
3. Fill in the form with proper RDS data:
   - Show Name: e.g., "מוזיקה לחג"
   - Host Name: e.g., "עורך: יואב חנני"
   - Start Time: e.g., "06:00"
   - End Time: e.g., "23:59"
   - RDS Radio Text: e.g., "Welcome new year! The best Israeli music, edited by Yoav Hanani"
   - RDS PTY: 26 (for music programming)
   - RDS MS: 1 (for music programming)
4. Save the slot

The form will now correctly calculate the `day_of_week` and use the actual selected date.

### Method 2: Use the Script (Recommended for holiday slots)

1. Use the holiday slot creation script for special programming days
2. Test with `--dry-run` first to check for conflicts
3. Create the slot with proper RDS data
4. Verify the RDS module shows the correct data

### Method 3: Manual Database Insert (Emergency only)

```sql
INSERT INTO schedule_slots (
  slot_date, day_of_week, start_time, end_time, show_name, host_name,
  has_lineup, color, is_prerecorded, is_collection,
  is_master, is_recurring, is_deleted, created_at, updated_at,
  rds_pty, rds_ms, rds_radio_text
) VALUES (
  '2025-09-23', 2, '06:00:00', '23:59:00', 
  'מוזיקה לחג', 'עורך: יואב חנני',
  false, 'green', false, false,
  false, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
  26, 1, 'Welcome new year! The best Israeli music, edited by Yoav Hanani'
);
```

## RDS Field Reference

### RDS PTY Codes (Program Type):
- 0 = NONE
- 1 = NEWS
- 4 = SPORTS
- 17 = FINANCE
- 21 = PHONE-IN
- 26 = NATIONAL MUSIC

### RDS MS Codes (Music/Speech):
- 0 = SPEECH ONLY
- 1 = MUSIC PROGRAMMING

### RDS Radio Text:
- Should be descriptive and informative
- Maximum 64 characters
- Can include show name and host name
- Example: "Welcome new year! The best Israeli music, edited by Yoav Hanani"

## Verification

After creating a holiday slot, verify it works by:

1. **Check the RDS endpoint**:
   ```bash
   curl -s http://localhost:5174/api/rds/current | jq .
   ```

2. **Check the public RDS JSON**:
   ```bash
   curl -s http://localhost:5174/rds.json | jq .
   ```

3. **Test the telnet transmission**:
   ```bash
   curl -s -X POST http://localhost:5174/api/rds/send-via-telnet | jq .
   ```

The response should show:
- `radio_text`: Your RDS text
- `pty`: Your PTY code
- `ms`: Your MS code
- `show_name`: Your show name
- `host_name`: Your host name
- `override_enabled`: false (to confirm it's using weekly schedule data)

## Troubleshooting

### Issue: RDS shows empty data
- Check if the slot exists in the database: `SELECT * FROM schedule_slots WHERE slot_date = 'YYYY-MM-DD' AND is_deleted = false;`
- Verify the slot has RDS data: `SELECT rds_radio_text, rds_pty, rds_ms FROM schedule_slots WHERE slot_date = 'YYYY-MM-DD';`
- Check if override is enabled: `SELECT override_enabled FROM rds_settings ORDER BY created_at DESC LIMIT 1;`

### Issue: UI save fails
- Check server logs for time conflict errors
- Verify the `day_of_week` is calculated correctly
- Ensure no overlapping slots exist for the same date and time

### Issue: Script fails
- Check database connection
- Verify date format is YYYY-MM-DD
- Use `--dry-run` to test configuration first

## Prevention

To prevent this issue in the future:

1. **Always populate RDS fields** when creating slots
2. **Use the holiday script** for special programming days
3. **Test with dry-run** before creating slots
4. **Verify RDS data** after creating slots
5. **Keep override disabled** unless specifically needed for testing

## Files Modified

- `src/components/schedule/forms/ScheduleSlotForm.tsx` - Fixed day_of_week calculation
- `server/routes/schedule.js` - Added RDS validation
- `server/scripts/create-holiday-slot.js` - New holiday slot creation script
- `RDS_MODULE_FIX_GUIDE.md` - This documentation

