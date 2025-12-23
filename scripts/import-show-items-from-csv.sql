\echo 'Starting staged import from CSV into show_items'

BEGIN;

-- Staging table
DROP TABLE IF EXISTS tmp_import_show_items;
CREATE TEMP TABLE tmp_import_show_items (
  id TEXT,
  show_id TEXT,
  position TEXT,
  name TEXT,
  title TEXT,
  details TEXT,
  phone TEXT,
  duration TEXT,
  is_break TEXT,
  is_note TEXT,
  created_at TEXT,
  is_divider TEXT
);

-- Load CSV (client-side path)
\copy tmp_import_show_items FROM '/home/iteam/radio-lineup-generator-rtl-78/public/temp/source.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', QUOTE '"', ESCAPE '"');

-- Sanity: rows loaded
SELECT COUNT(*) AS staged_rows FROM tmp_import_show_items;

-- Insert/Upsert into show_items
WITH to_upsert AS (
  SELECT 
    id::uuid AS id,
    NULLIF(show_id, '')::uuid AS show_id,
    COALESCE(NULLIF(position, '')::int, 0) AS position,
    COALESCE(name, '') AS name,
    NULLIF(title, '') AS title,
    NULLIF(details, '') AS details,
    NULLIF(phone, '') AS phone,
    COALESCE(NULLIF(duration, '')::int, 0) AS duration,
    (lower(coalesce(is_break,'')) IN ('true','t','1','yes','y')) AS is_break,
    (lower(coalesce(is_note,'')) IN ('true','t','1','yes','y')) AS is_note,
    (lower(coalesce(is_divider,'')) IN ('true','t','1','yes','y')) AS is_divider,
    NULLIF(created_at, '')::timestamptz AS created_at
  FROM tmp_import_show_items
  WHERE id ~ '^[0-9a-fA-F-]{36}$'
)
INSERT INTO show_items (
  id, show_id, position, name, title, details, phone, duration,
  is_break, is_note, is_divider, created_at
)
SELECT 
  u.id, u.show_id, u.position, u.name, u.title, u.details, u.phone, u.duration,
  u.is_break, u.is_note, u.is_divider, COALESCE(u.created_at, CURRENT_TIMESTAMP)
FROM to_upsert u
WHERE EXISTS (SELECT 1 FROM shows s WHERE s.id = u.show_id)
ON CONFLICT (id) DO UPDATE SET
  show_id = EXCLUDED.show_id,
  position = EXCLUDED.position,
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  details = EXCLUDED.details,
  phone = EXCLUDED.phone,
  duration = EXCLUDED.duration,
  is_break = EXCLUDED.is_break,
  is_note = EXCLUDED.is_note,
  is_divider = EXCLUDED.is_divider,
  created_at = EXCLUDED.created_at;

-- Report rows now present in show_items that came from this CSV (by id match)
SELECT COUNT(*) AS affected_rows
FROM show_items si
WHERE EXISTS (
  SELECT 1 FROM tmp_import_show_items t WHERE t.id::uuid = si.id
);

COMMIT;

\echo 'CSV import into show_items completed.'


