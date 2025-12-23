-- Check what slot the RDS module is finding
-- Run this to see what's in the database for "אדוני ראש העיר"

-- First, get current date and time in Jerusalem timezone
SELECT 
    CURRENT_DATE as today_db_date,
    CURRENT_TIME as current_db_time,
    NOW() as current_timestamp;

-- Check for the specific show "אדוני ראש העיר"
SELECT 
    id,
    show_name,
    slot_date,
    day_of_week,
    start_time,
    end_time,
    is_master,
    is_deleted,
    created_at
FROM schedule_slots
WHERE show_name LIKE '%אדוני ראש העיר%'
ORDER BY slot_date DESC, created_at DESC;

-- Check what slots match current time (around 11:00-12:00) for any date
SELECT 
    show_name,
    slot_date,
    start_time,
    end_time,
    is_master,
    is_deleted
FROM schedule_slots
WHERE is_deleted = false
  AND is_master = false
  AND start_time <= '11:59:59'
  AND end_time > '11:00:00'
ORDER BY slot_date DESC, start_time ASC
LIMIT 20;

-- Check what slots exist for today's date
SELECT 
    show_name,
    slot_date,
    start_time,
    end_time,
    is_master,
    is_deleted
FROM schedule_slots
WHERE is_deleted = false
  AND is_master = false
  AND slot_date = CURRENT_DATE
ORDER BY start_time ASC;


