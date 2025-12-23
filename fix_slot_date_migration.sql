-- Fix slot_date constraint for master schedule functionality
-- This migration corrects the issue where slot_date was set to NOT NULL
-- but master schedule slots need to have NULL slot_date

-- 1. First, let's see the current state
SELECT 'Current table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'schedule_slots' 
AND column_name IN ('slot_date', 'is_master', 'parent_slot_id', 'is_deleted')
ORDER BY ordinal_position;

-- 2. Drop the NOT NULL constraint on slot_date
ALTER TABLE schedule_slots ALTER COLUMN slot_date DROP NOT NULL;

-- 3. Update existing master slots to have NULL slot_date
-- (This assumes that slots with is_master=true should have NULL slot_date)
UPDATE schedule_slots 
SET slot_date = NULL
WHERE is_master = true;

-- 4. Add a check constraint to ensure proper data integrity
-- Master slots must have NULL slot_date, weekly slots must have a date
ALTER TABLE schedule_slots 
ADD CONSTRAINT check_slot_date_master 
CHECK (
    (is_master = true AND slot_date IS NULL) OR 
    (is_master = false AND slot_date IS NOT NULL)
);

-- 5. Verify the changes
SELECT 'Updated table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'schedule_slots' 
AND column_name IN ('slot_date', 'is_master', 'parent_slot_id', 'is_deleted')
ORDER BY ordinal_position;

-- 6. Test inserting a master slot
SELECT 'Testing master slot insertion:' as info;
INSERT INTO schedule_slots (
  slot_date, start_time, end_time, show_name, host_name,
  has_lineup, color, is_prerecorded, is_collection,
  is_master, day_of_week, is_recurring, is_deleted, created_at
) VALUES (
  NULL, '06:00:00', '07:00:00', 'Test Master Show', 'Test Host',
  false, 'green', false, false, true, 0, true, false, CURRENT_TIMESTAMP
) RETURNING id, show_name, day_of_week, is_master, slot_date;

-- 7. Clean up test data
DELETE FROM schedule_slots WHERE show_name = 'Test Master Show';

-- 8. Show current data distribution
SELECT 'Current data distribution:' as info;
SELECT 
  is_master,
  COUNT(*) as count,
  COUNT(slot_date) as with_date,
  COUNT(*) - COUNT(slot_date) as with_null_date
FROM schedule_slots 
WHERE is_deleted = false
GROUP BY is_master;

SELECT 'Migration completed successfully!' as message; 