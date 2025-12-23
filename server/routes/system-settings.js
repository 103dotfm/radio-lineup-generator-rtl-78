import express from 'express';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// Get system setting by key
router.get('/', async (req, res) => {
  try {
    let key = req.query.key;
    
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

    const result = await query(
      'SELECT * FROM system_settings WHERE key = $1',
      [key]
    );

    if (result.error) {
      throw result.error;
    }

    // Return single result if requested
    if (req.query.single === 'true') {
      return res.json(result.data[0] || null);
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching system setting:', error);
    res.status(500).json({ error: 'Failed to fetch system setting' });
  }
});

// Update system setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const result = await query(
      `INSERT INTO system_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE
       SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value]
    );

    if (result.error) {
      throw result.error;
    }

    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
});

export default router; 