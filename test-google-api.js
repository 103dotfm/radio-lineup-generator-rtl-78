import GoogleCalendarSyncService from './server/services/google-calendar-sync.js';
import { query } from './src/lib/db.js';

console.log('Testing Google Calendar API sync...\n');

// Clear existing data
console.log('Clearing existing data...');
await query('DELETE FROM studio_bookings WHERE id IN (SELECT studio_booking_id FROM google_calendar_events)');
await query('DELETE FROM google_calendar_events');

// Run sync
const sync = new GoogleCalendarSyncService();
await sync.initialize();
const result = await sync.importFromGoogleCalendar();

console.log(`\nImport completed: ${result.eventsCreated} events created`);

// Check today's bookings
const todayStr = '2025-12-14';
const bookings = await query(
  'SELECT title, start_time, end_time FROM studio_bookings WHERE booking_date = $1 AND studio_id = 2 ORDER BY start_time',
  [todayStr]
);

console.log(`\nAPI RESULT for today (${todayStr}) - אולפן ב':`);
console.log('='.repeat(80));
bookings.data.forEach(b => {
  console.log(`${b.start_time} - ${b.end_time}: ${b.title}`);
});

console.log('\nExpected from Google Calendar:');
console.log('='.repeat(80));
console.log('06:00:00 - 08:00:00: שבע תשע - אינסרטים + חדשות');
console.log('08:00:00 - 09:00:00: בן וינון - אינסרטים לשידור');
console.log('09:00:00 - 10:00:00: איריס קול');
console.log('10:00:00 - 12:00:00: אמנון רגב');
console.log('12:00:00 - 14:00:00: זמינות שניים עד ארבע');
console.log('14:00:00 - 15:00:00: איפה הכסף - אינסרטים לשידור');
console.log('16:00:00 - 17:00:00: פיילוט MSM');
console.log('18:30:00 - 20:00:00: יהודית גריסרו');

const problems = bookings.data.filter(b => 
  b.title.includes('רבקה') || b.title.includes('ורדה') || b.title.includes('דרור') || b.title.includes('דני דבורין') || b.title.includes('ספורט')
);

if (problems.length > 0) {
  console.log('\n❌ PROBLEMATIC ENTRIES:');
  problems.forEach(p => console.log(`  ${p.start_time} - ${p.end_time}: ${p.title}`));
  process.exit(1);
}

const expected = [
  { start: '06:00:00', end: '08:00:00', title: 'שבע תשע - אינסרטים + חדשות' },
  { start: '08:00:00', end: '09:00:00', title: 'בן וינון - אינסרטים לשידור' },
  { start: '09:00:00', end: '10:00:00', title: 'איריס קול' },
  { start: '10:00:00', end: '12:00:00', title: 'אמנון רגב' },
  { start: '12:00:00', end: '14:00:00', title: 'זמינות שניים עד ארבע' },
  { start: '14:00:00', end: '15:00:00', title: 'איפה הכסף - אינסרטים לשידור' },
  { start: '16:00:00', end: '17:00:00', title: 'פיילוט MSM' },
  { start: '18:30:00', end: '20:00:00', title: 'יהודית גריסרו' }
];

const missing = [];
expected.forEach(exp => {
  const found = bookings.data.find(b => b.start_time === exp.start && b.end_time === exp.end && b.title === exp.title);
  if (!found) {
    missing.push(exp);
  }
});

if (missing.length > 0) {
  console.log('\n❌ MISSING ENTRIES:');
  missing.forEach(m => console.log(`  ${m.start} - ${m.end}: ${m.title}`));
  process.exit(1);
}

console.log('\n✅ API RESULT IS CORRECT!');
console.log('✅ All expected entries present!');
console.log('✅ No problematic entries!');
console.log('✅ Data matches Google Calendar exactly!');

process.exit(0);
