-- Report current duplicates (exact matches)
\echo 'Checking duplicate shows (exact name, date, time)...'
SELECT COUNT(*) AS duplicate_groups,
       COALESCE(SUM(cnt - 1), 0) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM shows
  GROUP BY name, date, time
  HAVING COUNT(*) > 1
) s;

\echo 'Checking duplicate show_items (exact across all fields)...'
SELECT COUNT(*) AS duplicate_groups,
       COALESCE(SUM(cnt - 1), 0) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM show_items
  GROUP BY show_id, position, name, title, details, phone, duration, is_break, is_note, is_divider
  HAVING COUNT(*) > 1
) s;

\echo 'Checking duplicate interviewees (exact across all fields)...'
SELECT COUNT(*) AS duplicate_groups,
       COALESCE(SUM(cnt - 1), 0) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM interviewees
  GROUP BY item_id, name, title, phone, duration
  HAVING COUNT(*) > 1
) s;

BEGIN;

-- Step 1: Deduplicate shows (same name, date, time). Reassign items first.
CREATE TEMP TABLE tmp_dupe_shows AS
WITH d AS (
  SELECT name, date, time,
         array_agg(id ORDER BY created_at NULLS LAST, id) AS ids
  FROM shows
  GROUP BY name, date, time
  HAVING COUNT(*) > 1
), m AS (
  SELECT (ids)[1] AS keep_id,
         unnest((ids)[2:array_length(ids,1)]) AS dup_id
  FROM d
)
SELECT keep_id, dup_id FROM m;

UPDATE show_items si
SET show_id = t.keep_id
FROM tmp_dupe_shows t
WHERE si.show_id = t.dup_id;

DELETE FROM shows s
USING tmp_dupe_shows t
WHERE s.id = t.dup_id;

-- Step 2: Deduplicate show_items (exact field match). Reassign interviewees first.
CREATE TEMP TABLE tmp_dupe_items AS
WITH d AS (
  SELECT show_id, position, name, title, details, phone, duration, is_break, is_note, is_divider,
         array_agg(id ORDER BY created_at NULLS LAST, id) AS ids
  FROM show_items
  GROUP BY show_id, position, name, title, details, phone, duration, is_break, is_note, is_divider
  HAVING COUNT(*) > 1
), m AS (
  SELECT (ids)[1] AS keep_id,
         unnest((ids)[2:array_length(ids,1)]) AS dup_id
  FROM d
)
SELECT keep_id, dup_id FROM m;

UPDATE interviewees iv
SET item_id = t.keep_id
FROM tmp_dupe_items t
WHERE iv.item_id = t.dup_id;

DELETE FROM show_items si
USING tmp_dupe_items t
WHERE si.id = t.dup_id;

-- Step 3: Deduplicate interviewees (exact field match) via window function
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY item_id, name, title, phone, duration
           ORDER BY created_at NULLS LAST, id
         ) AS rn
  FROM interviewees
)
DELETE FROM interviewees iv
USING ranked r
WHERE iv.id = r.id
  AND r.rn > 1;

COMMIT;

-- Report remaining duplicates
\echo 'Remaining duplicate shows (should be zero)...'
SELECT COUNT(*) AS duplicate_groups,
       COALESCE(SUM(cnt - 1), 0) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM shows
  GROUP BY name, date, time
  HAVING COUNT(*) > 1
) s;

\echo 'Remaining duplicate show_items (should be zero)...'
SELECT COUNT(*) AS duplicate_groups,
       COALESCE(SUM(cnt - 1), 0) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM show_items
  GROUP BY show_id, position, name, title, details, phone, duration, is_break, is_note, is_divider
  HAVING COUNT(*) > 1
) s;

\echo 'Remaining duplicate interviewees (should be zero)...'
SELECT COUNT(*) AS duplicate_groups,
       COALESCE(SUM(cnt - 1), 0) AS rows_to_delete
FROM (
  SELECT COUNT(*) AS cnt
  FROM interviewees
  GROUP BY item_id, name, title, phone, duration
  HAVING COUNT(*) > 1
) s;


