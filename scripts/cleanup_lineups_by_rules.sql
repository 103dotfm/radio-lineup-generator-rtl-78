-- Parameters (optional): set this to focus reports on a single lineup
-- \set target_show '0dbc6752-37e4-46ef-a339-fa85510e25bb'

\echo 'Pre-check: target lineup items (first 50 with position, name, phone)'
\if :{?target_show}
  SELECT id, position, name, phone
  FROM show_items
  WHERE show_id = :'target_show'
  ORDER BY position, created_at, id
  LIMIT 50;
\endif

\echo 'Pre-check: duplicate shows by (name, date)'
SELECT name, date, COUNT(*) AS cnt
FROM shows
GROUP BY name, date
HAVING COUNT(*) > 1
ORDER BY date DESC, name;

BEGIN;

CREATE TEMP TABLE tmp_adjacent_dupe_items AS
WITH base AS (
  SELECT
    id,
    show_id,
    position,
    created_at,
    TRIM(LOWER(name)) AS name_norm,
    NULLIF(TRIM(LOWER(COALESCE(phone, ''))), '') AS phone_norm
  FROM show_items
), significant AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY show_id ORDER BY position, created_at, id) AS rn
  FROM base
  WHERE phone_norm IS NOT NULL AND name_norm IS NOT NULL
), pairs AS (
  SELECT s1.*,
         s2.name_norm AS prev_name_norm,
         s2.phone_norm AS prev_phone_norm
  FROM significant s1
  JOIN significant s2
    ON s1.show_id = s2.show_id AND s1.rn = s2.rn + 1
)
SELECT id
FROM pairs
WHERE name_norm = prev_name_norm AND phone_norm = prev_phone_norm;

DELETE FROM interviewees iv
WHERE iv.item_id IN (SELECT id FROM tmp_adjacent_dupe_items);

DELETE FROM show_items si
USING tmp_adjacent_dupe_items c
WHERE si.id = c.id;

-- 2) Remove duplicate lineups with same (name, date) when first and last items match (by name & phone)
CREATE TEMP TABLE tmp_groups AS
SELECT name, date, array_agg(id ORDER BY created_at ASC, id) AS ids
FROM shows
GROUP BY name, date
HAVING COUNT(*) > 1;

CREATE TEMP TABLE tmp_first_last AS
SELECT s.id,
       -- first significant item by ascending position
       (
         SELECT TRIM(LOWER(si.name)) FROM show_items si
         WHERE si.show_id = s.id
           AND NULLIF(TRIM(LOWER(COALESCE(si.phone, ''))), '') IS NOT NULL
           AND TRIM(LOWER(si.name)) IS NOT NULL
         ORDER BY si.position ASC, si.created_at ASC, si.id ASC
         LIMIT 1
       ) AS first_name,
       (
         SELECT NULLIF(TRIM(LOWER(COALESCE(si.phone, ''))), '') FROM show_items si
         WHERE si.show_id = s.id
           AND NULLIF(TRIM(LOWER(COALESCE(si.phone, ''))), '') IS NOT NULL
           AND TRIM(LOWER(si.name)) IS NOT NULL
         ORDER BY si.position ASC, si.created_at ASC, si.id ASC
         LIMIT 1
       ) AS first_phone,
       -- last significant item by descending position
       (
         SELECT TRIM(LOWER(si.name)) FROM show_items si
         WHERE si.show_id = s.id
           AND NULLIF(TRIM(LOWER(COALESCE(si.phone, ''))), '') IS NOT NULL
           AND TRIM(LOWER(si.name)) IS NOT NULL
         ORDER BY si.position DESC, si.created_at DESC, si.id DESC
         LIMIT 1
       ) AS last_name,
       (
         SELECT NULLIF(TRIM(LOWER(COALESCE(si.phone, ''))), '') FROM show_items si
         WHERE si.show_id = s.id
           AND NULLIF(TRIM(LOWER(COALESCE(si.phone, ''))), '') IS NOT NULL
           AND TRIM(LOWER(si.name)) IS NOT NULL
         ORDER BY si.position DESC, si.created_at DESC, si.id DESC
         LIMIT 1
       ) AS last_phone
FROM shows s
JOIN (
  SELECT unnest(ids) AS id FROM tmp_groups
) u ON u.id = s.id;

-- Identify shows to delete: match first/last (name+phone) with the canonical show in the group
CREATE TEMP TABLE tmp_dupe_shows_delete AS
SELECT p.id AS dup_id
FROM tmp_groups g
JOIN LATERAL (
  SELECT (g.ids)[1] AS keep_id
)
AS k ON TRUE
JOIN tmp_first_last kp ON kp.id = k.keep_id
JOIN (
  SELECT id, first_name, first_phone, last_name, last_phone FROM tmp_first_last
) p ON p.id = ANY (g.ids)
WHERE p.id <> k.keep_id
  AND p.first_name IS NOT NULL AND kp.first_name IS NOT NULL
  AND p.first_name = kp.first_name
  AND COALESCE(p.first_phone, '') = COALESCE(kp.first_phone, '')
  AND p.last_name IS NOT NULL AND kp.last_name IS NOT NULL
  AND p.last_name = kp.last_name
  AND COALESCE(p.last_phone, '') = COALESCE(kp.last_phone, '');

-- Delete those shows entirely (items will cascade; then cleanup orphan interviewees)
DELETE FROM shows s
USING tmp_dupe_shows_delete t
WHERE s.id = t.dup_id;

DELETE FROM interviewees iv
WHERE NOT EXISTS (
  SELECT 1 FROM show_items si WHERE si.id = iv.item_id
);

COMMIT;

\echo 'Post-check: target lineup items (first 50 with position, name, phone)'
\if :{?target_show}
  SELECT id, position, name, phone
  FROM show_items
  WHERE show_id = :'target_show'
  ORDER BY position, created_at, id
  LIMIT 50;
\endif

\echo 'Post-check: duplicate shows by (name, date)'
SELECT name, date, COUNT(*) AS cnt
FROM shows
GROUP BY name, date
HAVING COUNT(*) > 1
ORDER BY date DESC, name;


