import express from 'express';
import { query } from '../../src/lib/db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.role || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

// Get all engineer work arrangements
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM engineer_work_arrangements ORDER BY week_start DESC'
    );
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching engineer work arrangements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get engineer work arrangement by week
router.get('/week/:weekStart', async (req, res) => {
  const { weekStart } = req.params;
  
  try {
    const result = await query(
      'SELECT * FROM engineer_work_arrangements WHERE week_start = $1',
      [weekStart]
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Work arrangement not found for this week' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error fetching engineer work arrangement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new engineer work arrangement
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { week_start, notes } = req.body;
  
  try {
    // Check if arrangement already exists for this week
    const existing = await query(
      'SELECT id FROM engineer_work_arrangements WHERE week_start = $1',
      [week_start]
    );
    
    if (existing.data.length > 0) {
      return res.status(409).json({ error: 'Work arrangement already exists for this week' });
    }
    
    const result = await query(
      'INSERT INTO engineer_work_arrangements (week_start, notes) VALUES ($1, $2) RETURNING *',
      [week_start, notes]
    );
    
    res.status(201).json(result.data[0]);
  } catch (error) {
    console.error('Error creating engineer work arrangement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update engineer work arrangement
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { week_start, notes, is_published } = req.body;
  
  try {
    const result = await query(
      'UPDATE engineer_work_arrangements SET week_start = $1, notes = $2, is_published = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [week_start, notes, is_published, id]
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Work arrangement not found' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating engineer work arrangement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete engineer work arrangement
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM engineer_work_arrangements WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Work arrangement not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting engineer work arrangement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shifts for arrangement
router.get('/:id/shifts', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      `SELECT es.*, s.name as studio_name
       FROM engineer_shifts es
       LEFT JOIN studios s ON es.studio_id = s.id
       WHERE es.arrangement_id = $1
       ORDER BY es.position ASC`,
      [id]
    );
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching engineer shifts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create engineer shift
router.post('/:id/shifts', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { position, name, section_name, day_of_week, shift_type, start_time, end_time, person_name, additional_text, studio_id, is_custom_time, is_hidden } = req.body;
  
  try {
    const result = await query(
      `INSERT INTO engineer_shifts 
       (arrangement_id, position, name, section_name, day_of_week, shift_type, 
        start_time, end_time, person_name, additional_text, studio_id, is_custom_time, is_hidden) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING *`,
      [id, position, name, section_name, day_of_week, shift_type, start_time, end_time, person_name, additional_text, studio_id, is_custom_time, is_hidden]
    );
    
    res.status(201).json(result.data[0]);
  } catch (error) {
    console.error('Error creating engineer shift:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update engineer shift
router.put('/shifts/:shiftId', authenticateToken, requireAdmin, async (req, res) => {
  const { shiftId } = req.params;
  const { position, name, section_name, day_of_week, shift_type, start_time, end_time, person_name, additional_text, studio_id, is_custom_time, is_hidden } = req.body;
  
  try {
    const result = await query(
      `UPDATE engineer_shifts 
       SET position = $1, name = $2, section_name = $3, day_of_week = $4, shift_type = $5,
           start_time = $6, end_time = $7, person_name = $8, additional_text = $9, 
           studio_id = $10, is_custom_time = $11, is_hidden = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13 
       RETURNING *`,
      [position, name, section_name, day_of_week, shift_type, start_time, end_time, person_name, additional_text, studio_id, is_custom_time, is_hidden, shiftId]
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Engineer shift not found' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating engineer shift:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete engineer shift
router.delete('/shifts/:shiftId', authenticateToken, requireAdmin, async (req, res) => {
  const { shiftId } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM engineer_shifts WHERE id = $1 RETURNING *',
      [shiftId]
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Engineer shift not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting engineer shift:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get engineers assigned to studio bookings for a specific date
router.get('/assignments/:date', async (req, res) => {
  const { date } = req.params;
  
  try {
    const result = await query(
      `SELECT sb.*, s.name as studio_name, es.person_name as assigned_engineer,
              es.start_time as engineer_start_time, es.end_time as engineer_end_time
       FROM studio_bookings sb
       JOIN studios s ON sb.studio_id = s.id
       LEFT JOIN engineer_shifts es ON es.studio_id = sb.studio_id 
           AND es.day_of_week = EXTRACT(DOW FROM sb.booking_date)::integer + 1
           AND sb.start_time BETWEEN es.start_time AND es.end_time
           AND es.arrangement_id IN (
             SELECT id FROM engineer_work_arrangements 
             WHERE week_start <= $1::date 
             AND (week_start + INTERVAL '6 days') >= $1::date
             AND is_published = true
           )
       WHERE sb.booking_date = $1 AND sb.status = 'approved'
       ORDER BY sb.start_time`,
      [date]
    );
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching engineer assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all engineers (from workers table with engineer role)
router.get('/engineers', async (req, res) => {
  try {
    const result = await query(
      `SELECT w.*, u.email, u.name as user_name
       FROM workers w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.department = 'engineers' OR w.position ILIKE '%engineer%'
       ORDER BY w.name`
    );
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching engineers:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

