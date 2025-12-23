import express from 'express';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// GET all prizes, sorted with incomplete first
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM prizes ORDER BY completed ASC, created_at DESC');
    if (result.error) {
      throw result.error;
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET unique prizes for autocomplete
router.get('/unique', async (req, res) => {
  try {
    const result = await query("SELECT DISTINCT jsonb_array_elements_text(prizes) as prize FROM prizes WHERE prizes IS NOT NULL AND jsonb_array_length(prizes) > 0");
    if (result.error) {
      throw result.error;
    }
    const uniquePrizes = result.data.map(row => row.prize);
    res.json(uniquePrizes);
  } catch (error) {
    console.error('Error fetching unique prizes:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new prize
router.post('/', async (req, res) => {
  const { full_name, phone_number, prizes, status, notes } = req.body;
  try {
    // Convert prizes array to JSONB format
    const prizesJson = JSON.stringify(prizes);
    
    const result = await query(
      'INSERT INTO prizes (full_name, phone_number, prizes, status, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [full_name, phone_number, prizesJson, status, notes || null]
    );
    if (result.error) {
      throw result.error;
    }
    res.json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update prize
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, phone_number, prizes, status, notes, completed } = req.body;
  try {
    // Convert prizes array to JSONB format
    const prizesJson = JSON.stringify(prizes);
    
    const result = await query(
      'UPDATE prizes SET full_name = $1, phone_number = $2, prizes = $3, status = $4, notes = $5, completed = $6 WHERE id = $7 RETURNING *',
      [full_name, phone_number, prizesJson, status, notes || null, completed, id]
    );
    if (result.error) {
      throw result.error;
    }
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Prize not found' });
    }
    res.json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE prize
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM prizes WHERE id = $1 RETURNING *', [id]);
    if (result.error) {
      throw result.error;
    }
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Prize not found' });
    }
    res.json({ message: 'Prize deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
