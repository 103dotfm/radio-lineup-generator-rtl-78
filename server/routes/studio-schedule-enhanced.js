import express from 'express';
import { query } from '../../src/lib/db.js';
import { format, addWeeks } from 'date-fns';
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

// Get bookings for date range with engineer assignments
router.get('/bookings', async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    let bookings = await query(
      `SELECT b.*, s.name as studio_name,
              u.full_name as user_name, u.email as user_email,
              es.person_name as assigned_engineer
       FROM studio_bookings b 
       JOIN studios s ON b.studio_id = s.id 
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN engineer_shifts es ON es.studio_id = b.studio_id 
           AND es.day_of_week = EXTRACT(DOW FROM b.booking_date)::integer + 1
           AND b.start_time BETWEEN es.start_time AND es.end_time
       WHERE b.booking_date >= $1 AND b.booking_date <= $2
       ORDER BY b.booking_date, b.start_time`,
      [start_date, end_date]
    );

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

// Create new booking request with email notifications
router.post('/bookings', authenticateToken, async (req, res) => {
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
       (studio_id, booking_date, start_time, end_time, title, notes, user_id, is_recurring, recurrence_rule, recurrence_end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [studio_id, booking_date, start_time, end_time, title, notes, user_id, is_recurring, recurrence_rule, recurrence_end_date]
    );

    const booking = result.data[0];

    // Send email notification to approvers
    await sendBookingRequestNotification(booking);

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking status with email notifications
router.patch('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  try {
    // Get booking details for email notification
    const bookingResult = await query(
      `SELECT sb.*, u.full_name as user_name, u.email as user_email, s.name as studio_name
       FROM studio_bookings sb
       JOIN users u ON sb.user_id = u.id
       JOIN studios s ON sb.studio_id = s.id
       WHERE sb.id = $1`,
      [id]
    );

    if (bookingResult.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.data[0];

    // Update booking status
    const result = await query(
      'UPDATE studio_bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    // Send email notification to user
    await sendBookingStatusNotification(booking, status, admin_notes);

    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create direct booking
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
    console.error('Error creating admin booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending booking requests for approval
router.get('/admin/pending-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT sb.*, u.full_name as user_name, u.email as user_email, s.name as studio_name
       FROM studio_bookings sb
       JOIN users u ON sb.user_id = u.id
       JOIN studios s ON sb.studio_id = s.id
       WHERE sb.status = 'pending'
       ORDER BY sb.created_at DESC`
    );

    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk approve/deny requests
router.post('/admin/bulk-update', authenticateToken, requireAdmin, async (req, res) => {
  const { booking_ids, status, admin_notes } = req.body;

  try {
    const results = [];
    
    for (const bookingId of booking_ids) {
      // Get booking details for email notification
      const bookingResult = await query(
        `SELECT sb.*, u.full_name as user_name, u.email as user_email, s.name as studio_name
         FROM studio_bookings sb
         JOIN users u ON sb.user_id = u.id
         JOIN studios s ON sb.studio_id = s.id
         WHERE sb.id = $1`,
        [bookingId]
      );

      if (bookingResult.data.length > 0) {
        const booking = bookingResult.data[0];
        
        // Update booking status
        const updateResult = await query(
          'UPDATE studio_bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [status, bookingId]
        );

        results.push(updateResult.data[0]);

        // Send email notification
        await sendBookingStatusNotification(booking, status, admin_notes);
      }
    }

    res.json({ success: true, updated_count: results.length, results });
  } catch (error) {
    console.error('Error bulk updating bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Calendar sync endpoints
router.post('/sync/import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Always return immediately and process in background to prevent crashes
    res.json({ 
      success: true, 
      message: 'Sync started in background. This may take a few minutes.',
      status: 'processing'
    });

    // Process sync in background - don't await it
    calendarSync.importFromGoogleCalendar()
      .then(result => {
        console.log('Background sync completed:', result);
      })
      .catch(error => {
        console.error('Background sync error:', error);
      });
  } catch (error) {
    console.error('Error starting Google Calendar sync:', error);
    // Don't send error response since we already sent success
    // Just log it
  }
});

// Clear all Google Calendar imported bookings (admin only)
router.post('/sync/clear', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Delete all bookings that have a corresponding google_calendar_events entry
    const deleteResult = await query(
      `DELETE FROM studio_bookings 
       WHERE id IN (
         SELECT studio_booking_id 
         FROM google_calendar_events
       )
       RETURNING *`
    );

    // Also delete orphaned google_calendar_events entries
    await query('DELETE FROM google_calendar_events');
    
    // Also delete any bookings that are in the past (cleanup old data)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const deletePastResult = await query(
      `DELETE FROM studio_bookings 
       WHERE booking_date < $1
       RETURNING *`,
      [today]
    );

    const deletedCount = deleteResult.data?.length || 0;
    const deletedPastCount = deletePastResult.data?.length || 0;
    console.log(`Cleared ${deletedCount} Google Calendar imported bookings and ${deletedPastCount} past bookings`);
    
    res.json({ 
      success: true, 
      deleted_count: deletedCount,
      deleted_past_count: deletedPastCount,
      message: `Cleared ${deletedCount} Google Calendar imported bookings and ${deletedPastCount} past bookings` 
    });
  } catch (error) {
    console.error('Error clearing Google Calendar bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deduplicate existing bookings
router.post('/sync/deduplicate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Find duplicate bookings (same studio, date, time, and title)
    const duplicatesResult = await query(
      `SELECT studio_id, booking_date, start_time, end_time, title, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
       FROM studio_bookings
       GROUP BY studio_id, booking_date, start_time, end_time, title
       HAVING COUNT(*) > 1`
    );

    let deletedCount = 0;
    const duplicateGroups = duplicatesResult.data || [];

    for (const group of duplicateGroups) {
      // Keep the first one (oldest), delete the rest
      const idsToDelete = group.ids.slice(1);
      
      for (const id of idsToDelete) {
        // Delete google_calendar_events entries first (CASCADE should handle this, but being explicit)
        await query('DELETE FROM google_calendar_events WHERE studio_booking_id = $1', [id]);
        // Delete the booking
        await query('DELETE FROM studio_bookings WHERE id = $1', [id]);
        deletedCount++;
      }
    }

    console.log(`Deduplicated ${deletedCount} duplicate bookings from ${duplicateGroups.length} groups`);
    
    res.json({ 
      success: true, 
      deleted_count: deletedCount,
      duplicate_groups: duplicateGroups.length,
      message: `Removed ${deletedCount} duplicate bookings` 
    });
  } catch (error) {
    console.error('Error deduplicating bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await calendarSync.exportToGoogleCalendar();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sync/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await calendarSync.getSyncLogs();
    res.json(result);
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approver management
router.get('/admin/approvers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT sba.*, u.full_name as name, u.email
       FROM studio_booking_approvers sba
       JOIN users u ON sba.user_id = u.id
       WHERE sba.is_active = true
       ORDER BY u.full_name`
    );
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching approvers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/approvers', authenticateToken, requireAdmin, async (req, res) => {
  const { user_id } = req.body;

  try {
    const result = await query(
      'INSERT INTO studio_booking_approvers (user_id) VALUES ($1) RETURNING *',
      [user_id]
    );
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error adding approver:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admin/approvers/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await query('UPDATE studio_booking_approvers SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing approver:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to send booking request notification
async function sendBookingRequestNotification(booking) {
  try {
    // Get approvers
    const approversResult = await query(
      `SELECT u.email, u.full_name as name
       FROM studio_booking_approvers sba
       JOIN users u ON sba.user_id = u.id
       WHERE sba.is_active = true`
    );

    if (approversResult.data.length === 0) return;

    const approverEmails = approversResult.data.map(approver => approver.email);
    
    // Get user details
    const userResult = await query('SELECT name, email FROM users WHERE id = $1', [booking.user_id]);
    const user = userResult.data[0];
    
    // Get studio details
    const studioResult = await query('SELECT name FROM studios WHERE id = $1', [booking.studio_id]);
    const studio = studioResult.data[0];

    // Create email content
    const subject = `בקשת הזמנת אולפן חדשה - ${studio.name}`;
    const body = `
      <div dir="rtl">
        <h2>בקשת הזמנת אולפן חדשה</h2>
        <p><strong>מבקש:</strong> ${user.name} (${user.email})</p>
        <p><strong>אולפן:</strong> ${studio.name}</p>
        <p><strong>תאריך:</strong> ${booking.booking_date}</p>
        <p><strong>שעה:</strong> ${booking.start_time} - ${booking.end_time}</p>
        <p><strong>כותרת:</strong> ${booking.title}</p>
        ${booking.notes ? `<p><strong>הערות:</strong> ${booking.notes}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL || 'http://l.103.fm:8080'}/admin/studio-schedule">למעבר לממשק האישור</a></p>
      </div>
    `;

    // Send email using existing email system
    const emailResult = await query(
      `INSERT INTO email_queue 
       (recipients, subject, body, email_type, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [JSON.stringify(approverEmails), subject, body, 'studio_booking_request', 'pending']
    );

    console.log('Booking request notification queued for approvers');
  } catch (error) {
    console.error('Error sending booking request notification:', error);
  }
}

// Helper function to send booking status notification
async function sendBookingStatusNotification(booking, status, adminNotes = '') {
  try {
    const statusText = status === 'approved' ? 'אושר' : status === 'denied' ? 'נדחה' : status;
    
    const subject = `עדכון בקשת הזמנת אולפן - ${statusText}`;
    const body = `
      <div dir="rtl">
        <h2>עדכון בקשת הזמנת אולפן</h2>
        <p><strong>סטטוס:</strong> ${statusText}</p>
        <p><strong>אולפן:</strong> ${booking.studio_name}</p>
        <p><strong>תאריך:</strong> ${booking.booking_date}</p>
        <p><strong>שעה:</strong> ${booking.start_time} - ${booking.end_time}</p>
        <p><strong>כותרת:</strong> ${booking.title}</p>
        ${adminNotes ? `<p><strong>הערות מנהל:</strong> ${adminNotes}</p>` : ''}
        ${status === 'approved' ? '<p>ההזמנה אושרה בהצלחה!</p>' : ''}
        ${status === 'denied' ? '<p>ההזמנה נדחתה. אנא צור קשר עם המנהל לפרטים נוספים.</p>' : ''}
      </div>
    `;

    // Send email to user
    const emailResult = await query(
      `INSERT INTO email_queue 
       (recipients, subject, body, email_type, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [JSON.stringify([booking.user_email]), subject, body, 'studio_booking_status', 'pending']
    );

    console.log(`Booking status notification sent to ${booking.user_email}`);
  } catch (error) {
    console.error('Error sending booking status notification:', error);
  }
}

export default router;

