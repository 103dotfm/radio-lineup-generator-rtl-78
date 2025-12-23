\echo 'Importing interviewees from show_items with mandatory fields and filters'

BEGIN;

-- Insert interviewees for eligible show_items
WITH eligible AS (
  SELECT 
    si.id AS item_id,
    si.name,
    si.title,
    si.details,
    si.phone,
    COALESCE(si.duration, 0) AS duration,
    si.created_at,
    si.show_id
  FROM show_items si
  WHERE 
    si.is_break = false
    AND si.is_note = false
    AND si.is_divider = false
    AND COALESCE(trim(si.name), '') <> ''
    AND lower(trim(si.name)) <> 'פרסומות'
    AND COALESCE(trim(si.phone), '') <> ''
    AND COALESCE(trim(si.title), '') <> ''
    AND COALESCE(trim(si.details), '') <> ''
)
INSERT INTO interviewees (name, title, phone, duration, item_id, created_at)
SELECT e.name, e.title, e.phone, e.duration, e.item_id, COALESCE(e.created_at, CURRENT_TIMESTAMP)
FROM eligible e
WHERE NOT EXISTS (
  SELECT 1 FROM interviewees iv WHERE iv.item_id = e.item_id
);

-- Report totals
SELECT 
  (SELECT COUNT(*) FROM interviewees) AS total_interviewees,
  (SELECT COUNT(*) FROM interviewees iv WHERE EXISTS (
    SELECT 1 FROM show_items si WHERE si.id = iv.item_id
  )) AS interviewees_linked_to_items;

-- Optional: sample join to show name and date
SELECT iv.name, iv.phone, iv.title, s.name AS show_name, s.date AS show_date
FROM interviewees iv
JOIN show_items si ON si.id = iv.item_id
LEFT JOIN shows s ON s.id = si.show_id
ORDER BY iv.created_at DESC
LIMIT 10;

COMMIT;

\echo 'Interviewees import completed.'



