
-- SQL function to get combined schedule for a specific date
-- This will be used by the update-schedule-cache edge function
CREATE OR REPLACE FUNCTION get_daily_schedule_for_date(
  target_date text,
  target_day_of_week integer
) RETURNS SETOF schedule_slots AS $$
DECLARE
  formatted_date date = target_date::date;
BEGIN
  -- First get all date-specific slots for the target date
  RETURN QUERY
  SELECT * FROM schedule_slots
  WHERE is_recurring = false 
    AND is_deleted = false
    AND date(created_at) = formatted_date;

  -- Then union with recurring slots for this day of the week 
  -- that don't have a date-specific override
  RETURN QUERY
  SELECT * FROM schedule_slots
  WHERE is_recurring = true 
    AND is_deleted = false
    AND day_of_week = target_day_of_week
    AND NOT EXISTS (
      SELECT 1 FROM schedule_slots s2
      WHERE s2.is_recurring = false 
        AND s2.is_deleted = false
        AND date(s2.created_at) = formatted_date
        AND s2.start_time = schedule_slots.start_time
    );
END;
$$ LANGUAGE plpgsql;
