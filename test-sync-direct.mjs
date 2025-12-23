#!/usr/bin/env node
/**
 * Direct test of Google Calendar sync
 */

import GoogleCalendarSyncService from './server/services/google-calendar-sync.js';
import { query } from './src/lib/db.js';

const sync = new GoogleCalendarSyncService();

async function main() {
  console.log('='.repeat(80));
  console.log('Google Calendar Sync Fix & Test');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Step 1: Initialize
    console.log('Step 1: Initializing...');
    await sync.initialize();
    console.log('✓ Initialized\n');

    // Step 2: Clear all Google Calendar bookings
    console.log('Step 2: Clearing all Google Calendar bookings...');
    const deleteResult = await query(`
      DELETE FROM studio_bookings 
      WHERE id IN (
        SELECT studio_booking_id FROM google_calendar_events
      )
    `);
    const deleteCount = deleteResult.rowCount || 0;
    
    await query(`DELETE FROM google_calendar_events`);
    console.log(`✓ Deleted ${deleteCount} bookings\n`);

    // Step 3: Import from Google Calendar
    console.log('Step 3: Importing from Google Calendar...');
    const importResult = await sync.importFromGoogleCalendar();
    console.log('✓ Import completed');
    console.log(`  - Events created: ${importResult.eventsCreated || 0}`);
    console.log(`  - Events updated: ${importResult.eventsUpdated || 0}`);
    console.log(`  - Conflicts: ${importResult.conflictsDetected || 0}\n`);

    // Step 4: Verify today's data
    console.log('Step 4: Verifying today\'s data...');
    const today = new Date();
    const jerusalemFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = jerusalemFormatter.formatToParts(today);
    const todayStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
    
    const todayBookings = await query(`
      SELECT title, booking_date, start_time, end_time, studio_id
      FROM studio_bookings
      WHERE booking_date = $1
      ORDER BY start_time
    `, [todayStr]);

    console.log(`\nFound ${todayBookings.data?.length || 0} bookings for today (${todayStr}):`);
    console.log('-'.repeat(80));
    
    if (todayBookings.data && todayBookings.data.length > 0) {
      todayBookings.data.forEach(booking => {
        const studio = booking.studio_id === 1 ? "אולפן א'" : 
                      booking.studio_id === 2 ? "אולפן ב'" : 
                      booking.studio_id === 3 ? "אולפן ג'" : 'לא ידוע';
        console.log(`${booking.start_time} - ${booking.end_time}: ${booking.title} (${studio})`);
      });
    } else {
      console.log('No bookings found for today');
    }
    console.log('-'.repeat(80));

    // Expected data
    const expected = [
      { time: '06:00:00', end: '08:00:00', title: 'שבע תשע - אינסרטים + חדשות', studio: 2 },
      { time: '08:00:00', end: '09:00:00', title: 'בן וינון - אינסרטים לשידור', studio: 2 },
      { time: '09:00:00', end: '10:00:00', title: 'איריס קול', studio: 2 },
      { time: '10:00:00', end: '12:00:00', title: 'אמנון רגב', studio: 2 },
      { time: '12:00:00', end: '14:00:00', title: 'זמינות שניים עד ארבע', studio: 2 },
      { time: '14:00:00', end: '15:00:00', title: 'איפה הכסף - אינסרטים לשידור', studio: 2 },
      { time: '16:00:00', end: '17:00:00', title: 'פיילוט MSM', studio: 2 },
      { time: '18:30:00', end: '20:00:00', title: 'יהודית גריסרו', studio: 2 }
    ];

    console.log('\nExpected:');
    expected.forEach(e => {
      const studio = e.studio === 1 ? "אולפן א'" : e.studio === 2 ? "אולפן ב'" : "אולפן ג'";
      console.log(`${e.time} - ${e.end}: ${e.title} (${studio})`);
    });
    console.log('-'.repeat(80));

    // Check for problems
    const problems = [];
    if (todayBookings.data) {
      todayBookings.data.forEach(b => {
        const exp = expected.find(e => e.time === b.start_time && e.studio === b.studio_id);
        if (!exp || exp.title !== b.title) {
          problems.push({ found: b, expected: exp });
        }
      });
    }

    if (problems.length > 0) {
      console.log('\n❌ PROBLEMS:');
      problems.forEach(p => {
        console.log(`  ${p.found.start_time}: Found "${p.found.title}", Expected: ${p.expected ? `"${p.expected.title}"` : 'none'}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All bookings match expected data!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
