import express from 'express';
import { query } from '../../src/lib/db.js';
import { format, addWeeks, subWeeks } from 'date-fns';
import jwt from 'jsonwebtoken';
import GoogleCalendarSyncService from '../services/google-calendar-sync.js';

const router = express.Router();
const calendarSync = new GoogleCalendarSyncService();

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

// Get all studios
router.get('/studios', async (req, res) => {
  try {
    const result = await query('SELECT * FROM studios ORDER BY name');
    if (!result || !result.data) {
      return res.json([]);
    }
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching studios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for date range
router.get('/bookings', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const result = await query(`
      SELECT b.*, s.name as studio_name,
             u.full_name as user_name, u.email as user_email,
             es.person_name as assigned_engineer
      FROM studio_bookings b 
      JOIN studios s ON b.studio_id = s.id 
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN engineer_shifts es ON es.studio_id = b.studio_id 
          AND es.day_of_week = EXTRACT(DOW FROM b.booking_date)::integer + 1
          AND b.start_time BETWEEN es.start_time AND es.end_time
      WHERE b.booking_date >= $1 AND b.booking_date <= $2
      ORDER BY b.booking_date, b.start_time
    `, [start_date, end_date]);

    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single booking
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT b.*, s.name as studio_name,
             u.full_name as user_name, u.email as user_email,
             es.person_name as assigned_engineer
      FROM studio_bookings b 
      JOIN studios s ON b.studio_id = s.id 
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN engineer_shifts es ON es.studio_id = b.studio_id 
          AND es.day_of_week = EXTRACT(DOW FROM b.booking_date)::integer + 1
          AND b.start_time BETWEEN es.start_time AND es.end_time
      WHERE b.id = $1
    `, [id]);

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.data[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create booking (authenticated users)
router.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const { studio_id, booking_date, start_time, end_time, title, notes } = req.body;
    
    // Validate required fields
    if (!studio_id || !booking_date || !start_time || !end_time || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for conflicts
    const conflictCheck = await query(`
      SELECT id FROM studio_bookings 
      WHERE studio_id = $1 AND booking_date = $2 
      AND (
        (start_time <= $3 AND end_time > $3) OR 
        (start_time < $4 AND end_time >= $4) OR
        (start_time >= $3 AND end_time <= $4)
      )
    `, [studio_id, booking_date, start_time, end_time]);

    if (conflictCheck.data && conflictCheck.data.length > 0) {
      return res.status(409).json({ error: 'Time slot conflict detected' });
    }

    const result = await query(`
      INSERT INTO studio_bookings 
      (studio_id, booking_date, start_time, end_time, title, notes, status, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) 
      RETURNING *
    `, [studio_id, booking_date, start_time, end_time, title, notes || '', req.user.userId]);

    res.status(201).json(result.data[0]);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking status (admin only)
router.patch('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    
    if (!['pending', 'approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(`
      UPDATE studio_bookings 
      SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = $3 
      RETURNING *
    `, [status, admin_notes || '', id]);

    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete booking (admin only)
router.delete('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM studio_bookings WHERE id = $1 RETURNING *', [id]);
    
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Calendar sync endpoints
router.post('/sync/google-calendar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await calendarSync.syncGoogleCalendar();
    res.json({ 
      success: true, 
      message: 'Google Calendar sync completed',
      result 
    });
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sync logs
router.get('/sync/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM google_calendar_sync_logs 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoints
router.get('/admin/pending-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, s.name as studio_name,
             u.full_name as user_name, u.email as user_email
      FROM studio_bookings b 
      JOIN studios s ON b.studio_id = s.id 
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.status = 'pending'
      ORDER BY b.created_at DESC
    `);
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update bookings (admin only)
router.patch('/admin/bulk-update', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bookingIds, status, adminNotes } = req.body;
    
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ error: 'bookingIds array is required' });
    }
    
    if (!['pending', 'approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(`
      UPDATE studio_bookings 
      SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = ANY($3)
      RETURNING id, status
    `, [status, adminNotes || '', bookingIds]);

    res.json({ 
      success: true, 
      updated: result.data.length,
      bookings: result.data 
    });
  } catch (error) {
    console.error('Error bulk updating bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create admin booking (admin only)
router.post('/admin/bookings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studio_id, booking_date, start_time, end_time, title, notes, user_id } = req.body;
    
    if (!studio_id || !booking_date || !start_time || !end_time || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(`
      INSERT INTO studio_bookings 
      (studio_id, booking_date, start_time, end_time, title, notes, status, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7) 
      RETURNING *
    `, [studio_id, booking_date, start_time, end_time, title, notes || '', user_id || req.user.userId]);

    res.status(201).json(result.data[0]);
  } catch (error) {
    console.error('Error creating admin booking:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
