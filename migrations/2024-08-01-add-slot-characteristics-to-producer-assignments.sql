-- Add columns for robust recurring assignment matching
ALTER TABLE producer_assignments
  ADD COLUMN day_of_week INTEGER,
  ADD COLUMN start_time TIME,
  ADD COLUMN show_name TEXT;

-- Optionally, backfill existing assignments (if any remain)
-- UPDATE producer_assignments pa
-- SET day_of_week = s.day_of_week, start_time = s.start_time, show_name = s.show_name
-- FROM schedule_slots s
-- WHERE pa.slot_id = s.id; 