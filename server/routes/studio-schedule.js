import express from 'express';
import { query } from '../../src/lib/db.js';
import { format, addWeeks } from 'date-fns';
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

// Get all studios
router.get('/studios', async (req, res) => {
  try {
    const result = await query('SELECT * FROM studios');
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
  const { start_date, end_date } = req.query;
  try {
    let bookings = await query(
      `SELECT b.*, s.name as studio_name 
       FROM studio_bookings b 
       JOIN studios s ON b.studio_id = s.id 
       WHERE booking_date >= $1 AND booking_date <= $2`,
      [start_date, end_date]
    );

    // Handle null/undefined data
    if (!bookings || !bookings.data) {
      return res.json([]);
    }

    // Handle recurring bookings by generating instances
    const allBookings = [];
    for (const booking of bookings.data) {
      if (booking.is_recurring && booking.recurrence_rule === 'weekly') {
        let currentDate = new Date(booking.booking_date);
        const end = booking.recurrence_end_date ? new Date(booking.recurrence_end_date) : new Date(end_date);
        while (currentDate <= end) {
          allBookings.push({ ...booking, booking_date: format(currentDate, 'yyyy-MM-dd') });
          currentDate = addWeeks(currentDate, 1);
        }
      } else {
        allBookings.push(booking);
      }
    }

    res.json(allBookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new booking request (requires authentication)
router.post('/bookings', authenticateToken, async (req, res) => {
  const { studio_id, booking_date, start_time, end_time, title, notes, is_recurring, recurrence_rule, recurrence_end_date } = req.body;
  const user_id = req.user.userId; // Use userId from JWT

  try {
    // Check for conflicts
    const conflicts = await query(
      `SELECT * FROM studio_bookings 
       WHERE studio_id = $1 
       AND booking_date = $2 
       AND status = 'approved'
       AND (start_time < $4 AND end_time > $3)`,
      [studio_id, booking_date, start_time, end_time]
    );

    if (conflicts.data.length > 0) {
      return res.status(409).json({ error: 'Time conflict with existing booking' });
    }

    const result = await query(
      `INSERT INTO studio_bookings 
       (studio_id, booking_date, start_time, end_time, title, notes, user_id, is_recurring, recurrence_rule, recurrence_end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [studio_id, booking_date, start_time, end_time, title, notes, user_id, is_recurring, recurrence_rule, recurrence_end_date]
    );

    res.status(201).json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update booking status (admin only)
router.patch('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await query(
      'UPDATE studio_bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create direct booking (admin only)
router.post('/admin/bookings', authenticateToken, requireAdmin, async (req, res) => {
  const { studio_id, booking_date, start_time, end_time, title, notes, is_recurring, recurrence_rule, recurrence_end_date } = req.body;
  const user_id = req.user.userId;

  try {
    // Check for conflicts
    const conflicts = await query(
      `SELECT * FROM studio_bookings 
       WHERE studio_id = $1 
       AND booking_date = $2 
       AND status = 'approved'
       AND (start_time < $4 AND end_time > $3)`,
      [studio_id, booking_date, start_time, end_time]
    );

    if (conflicts.data.length > 0) {
      return res.status(409).json({ error: 'Time conflict with existing booking' });
    }

    const result = await query(
      `INSERT INTO studio_bookings 
       (studio_id, booking_date, start_time, end_time, title, notes, user_id, is_recurring, recurrence_rule, recurrence_end_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved') 
       RETURNING *`,
      [studio_id, booking_date, start_time, end_time, title, notes, user_id, is_recurring, recurrence_rule, recurrence_end_date]
    );

    res.status(201).json(result.data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete booking (admin only)
router.delete('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM studio_bookings WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 