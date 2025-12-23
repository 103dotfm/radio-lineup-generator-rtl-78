import express from 'express';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// GET /api/system-settings?key=app_domain or ?where={"key":{"eq":"app_domain"}}
router.get('/', async (req, res) => {
  let key = req.query.key;
  console.log('system-settings GET: key=', key, 'where=', req.query.where);
  // Support Supabase-style ?where={"key":{"eq":"app_domain"}}
  if (!key && req.query.where) {
    try {
      const where = typeof req.query.where === 'string' ? JSON.parse(req.query.where) : req.query.where;
      if (where && where.key && where.key.eq) {
        key = where.key.eq;
      }
    } catch (e) {
      console.error('Failed to parse where param:', req.query.where, e);
      return res.status(400).json({ error: 'Invalid where parameter: must be valid JSON' });
    }
  }
  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }
  try {
    const result = await query('SELECT * FROM system_settings WHERE key = $1 LIMIT 1', [key]);
    if (result.error) throw result.error;
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/system-settings { key, value }
router.post('/', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }
  try {
    const result = await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, value]
    );
    if (result.error) throw result.error;
    res.json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router; 