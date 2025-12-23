// Test script to check what the RDS module is finding
import { query } from './src/lib/db.js';

async function testRDSQuery() {
  try {
    // Get current date and time in Jerusalem timezone
    const now = new Date();
    const jerusalemFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = jerusalemFormatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    
    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${hour}:${minute}:${second}`;
    
    console.log(`\n=== RDS Query Test ===`);
    console.log(`Current Date (Jerusalem): ${currentDate}`);
    console.log(`Current Time (Jerusalem): ${currentTime}\n`);
    
    // Check for "אדוני ראש העיר" show
    console.log('=== Checking for "אדוני ראש העיר" show ===');
    const showResult = await query(
      `SELECT id, show_name, slot_date, day_of_week, start_time, end_time, is_master, is_deleted
       FROM schedule_slots
       WHERE show_name LIKE '%אדוני ראש העיר%'
       ORDER BY slot_date DESC, created_at DESC`,
      []
    );
    console.log('Found slots:', JSON.stringify(showResult.data, null, 2));
    
    // Check what slots match current time (any date)
    console.log(`\n=== Slots matching current time ${currentTime} (any date) ===`);
    const timeMatchResult = await query(
      `SELECT show_name, slot_date, start_time, end_time, is_master, is_deleted
       FROM schedule_slots
       WHERE is_deleted = false 
         AND is_master = false
         AND start_time <= $1 
         AND end_time > $1
       ORDER BY slot_date DESC, start_time ASC
       LIMIT 10`,
      [currentTime]
    );
    console.log('Matching slots:', JSON.stringify(timeMatchResult.data, null, 2));
    
    // Check what the RDS query would find
    console.log(`\n=== What RDS query finds (slot_date = ${currentDate}, time = ${currentTime}) ===`);
    const rdsResult = await query(
      `SELECT s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated, s.show_name, s.host_name, s.start_time, s.end_time, s.slot_date
       FROM schedule_slots s
       WHERE s.is_deleted = false 
         AND s.is_master = false
         AND s.slot_date = $1::date
         AND s.start_time <= $2 
         AND s.end_time > $2
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [currentDate, currentTime]
    );
    console.log('RDS result:', JSON.stringify(rdsResult.data, null, 2));
    
    // Check slots for today
    console.log(`\n=== All slots for today (${currentDate}) ===`);
    const todayResult = await query(
      `SELECT show_name, slot_date, start_time, end_time
       FROM schedule_slots
       WHERE is_deleted = false 
         AND is_master = false
         AND slot_date = $1::date
       ORDER BY start_time ASC`,
      [currentDate]
    );
    console.log('Today slots:', JSON.stringify(todayResult.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testRDSQuery();


