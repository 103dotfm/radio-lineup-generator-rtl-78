import express from 'express';
import { query } from '../../src/lib/db.js';
import { format } from 'date-fns';

const router = express.Router();

// Get day notes for a date range
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, isBottomNote = false } = req.query;
    // Use the date strings directly since they're already in yyyy-MM-dd format
    const formattedStartDate = startDate;
    const formattedEndDate = endDate;
    
    const { data, error } = await query(
      'SELECT * FROM day_notes WHERE date >= $1 AND date <= $2 AND is_bottom_note = $3',
      [formattedStartDate, formattedEndDate, isBottomNote === 'true']
    );
    
    if (error) {
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching day notes:', error);
    res.status(500).json({ error: 'Failed to fetch day notes' });
  }
});

// Create a new day note
router.post('/', async (req, res) => {
  try {
    const { date, note, isBottomNote = false } = req.body;
    // Use the date string directly since it's already in yyyy-MM-dd format
    const formattedDate = date;
    
    const { data, error } = await query(
      'INSERT INTO day_notes (date, note, is_bottom_note) VALUES ($1, $2, $3) RETURNING *',
      [formattedDate, note, isBottomNote]
    );
    
    if (error) {
      throw error;
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error creating day note:', error);
    res.status(500).json({ error: 'Failed to create day note' });
  }
});

// Update a day note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    const { data, error } = await query(
      'UPDATE day_notes SET note = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [note, id]
    );
    
    if (error) {
      throw error;
    }
    
    if (!data.length) {
      return res.status(404).json({ error: 'Day note not found' });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating day note:', error);
    res.status(500).json({ error: 'Failed to update day note' });
  }
});

// Delete a day note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await query(
      'DELETE FROM day_notes WHERE id = $1',
      [id]
    );
    
    if (error) {
      throw error;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting day note:', error);
    res.status(500).json({ error: 'Failed to delete day note' });
  }
});

export default router; 