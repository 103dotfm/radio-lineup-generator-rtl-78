import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadJson(jsonPath) {
  const content = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(content);
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  return value; // Let Postgres parse text/date strings
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  return value;
}

function normalizeInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function importData({ jsonPath, dryRun = false }) {
  const absPath = path.isAbsolute(jsonPath)
    ? jsonPath
    : path.join(__dirname, '..', jsonPath);

  const data = await loadJson(absPath);

  const shows = Array.isArray(data.shows_backup) ? data.shows_backup : [];
  const showItems = Array.isArray(data.show_items) ? data.show_items : [];
  const interviewees = Array.isArray(data.interviewees) ? data.interviewees : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert/Upsert shows first
    let showsInserted = 0;
    let showsUpdated = 0;
    for (const s of shows) {
      const params = [
        s.id,
        normalizeText(s.name),
        normalizeDate(s.date),
        normalizeText(s.time),
        normalizeText(s.slot_id),
        normalizeText(s.notes),
        normalizeDate(s.created_at)
      ];
      const sql = `
        INSERT INTO shows (id, name, date, time, slot_id, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          date = EXCLUDED.date,
          time = EXCLUDED.time,
          slot_id = EXCLUDED.slot_id,
          notes = EXCLUDED.notes
        RETURNING (xmax = 0) AS inserted;
      `;
      if (!dryRun) {
        const res = await client.query(sql, params);
        if (res.rows[0]?.inserted) showsInserted++; else showsUpdated++;
      }
    }

    // Insert/Upsert show_items
    let itemsInserted = 0;
    let itemsUpdated = 0;
    for (const it of showItems) {
      const params = [
        it.id,
        normalizeText(it.show_id),
        normalizeInt(it.position ?? 0),
        normalizeText(it.name),
        normalizeText(it.title),
        normalizeText(it.details),
        normalizeText(it.phone),
        normalizeInt(it.duration ?? 0),
        Boolean(it.is_break),
        Boolean(it.is_note),
        Boolean(it.is_divider),
        normalizeDate(it.created_at)
      ];
      const sql = `
        INSERT INTO show_items (
          id, show_id, position, name, title, details, phone, duration,
          is_break, is_note, is_divider, created_at
        ) VALUES (
          $1, $2, COALESCE($3, 0), $4, $5, $6, $7, COALESCE($8, 0),
          $9, $10, $11, COALESCE($12, NOW())
        )
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
          is_divider = EXCLUDED.is_divider
        RETURNING (xmax = 0) AS inserted;
      `;
      if (!dryRun) {
        const res = await client.query(sql, params);
        if (res.rows[0]?.inserted) itemsInserted++; else itemsUpdated++;
      }
    }

    // Insert/Upsert interviewees
    let intsInserted = 0;
    let intsUpdated = 0;
    for (const iv of interviewees) {
      const params = [
        iv.id,
        normalizeText(iv.name),
        normalizeText(iv.title),
        normalizeText(iv.phone),
        normalizeInt(iv.duration ?? null),
        normalizeText(iv.item_id),
        normalizeDate(iv.created_at)
      ];
      const sql = `
        INSERT INTO interviewees (
          id, name, title, phone, duration, item_id, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, COALESCE($7, NOW())
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          title = EXCLUDED.title,
          phone = EXCLUDED.phone,
          duration = EXCLUDED.duration,
          item_id = EXCLUDED.item_id
        RETURNING (xmax = 0) AS inserted;
      `;
      if (!dryRun) {
        const res = await client.query(sql, params);
        if (res.rows[0]?.inserted) intsInserted++; else intsUpdated++;
      }
    }

    if (!dryRun) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    return {
      shows: { inserted: showsInserted, updated: showsUpdated, total: shows.length },
      show_items: { inserted: itemsInserted, updated: itemsUpdated, total: showItems.length },
      interviewees: { inserted: intsInserted, updated: intsUpdated, total: interviewees.length }
    };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const jsonPath = process.env.JSON_PATH || 'public/temp/radio-data-export-2025-08-13.json';
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
  const result = await importData({ jsonPath, dryRun });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ jsonPath, dryRun, result }, null, 2));
}

main().then(() => {
  // eslint-disable-next-line no-console
  console.log('Import completed.');
  process.exit(0);
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Import failed:', err);
  process.exit(1);
});


