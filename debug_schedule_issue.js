import { query } from './src/lib/db.js';
import { format, startOfWeek, addDays } from 'date-fns';

// Set environment variables for database connection
process.env.DB_TYPE = 'local';
process.env.DB_USER = 'radiouser';
process.env.DB_PASSWORD = 'radio123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'radiodb';

async function debugScheduleIssue() {
  try {
    console.log('=== Debugging Schedule Issue ===\n');
    
    // Test database connection
    const testResult = await query('SELECT NOW() as current_time');
    if (testResult.error) {
      console.error('Database connection failed:', testResult.error);
      return;
    }
    console.log('Database connection successful:', testResult.data[0]);

    // Get current week
    const currentDate = new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    const formattedStartDate = format(weekStart, 'yyyy-MM-dd');
    const formattedEndDate = format(weekEnd, 'yyyy-MM-dd');
    
    console.log('\n=== Current Week ===');
    console.log('Week start:', formattedStartDate);
    console.log('Week end:', formattedEndDate);

    // Check work_arrangements table
    console.log('\n=== Work Arrangements (PDF files) ===');
    const workArrangementsResult = await query(`
      SELECT * FROM work_arrangements 
      WHERE week_start = $1 
      ORDER BY created_at DESC
    `, [formattedStartDate]);
    
    if (workArrangementsResult.error) {
      console.error('Error fetching work arrangements:', workArrangementsResult.error);
    } else {
      console.log('Work arrangements for current week:', workArrangementsResult.data);
      
      // Check specifically for producers
      const producersArrangements = workArrangementsResult.data.filter(wa => wa.type === 'producers');
      console.log('\nProducers work arrangements:', producersArrangements);
    }

    // Check producer_assignments table
    console.log('\n=== Producer Assignments ===');
    const producerAssignmentsResult = await query(`
      SELECT COUNT(*) as assignment_count 
      FROM producer_assignments 
      WHERE week_start = $1 AND is_deleted = false
    `, [formattedStartDate]);
    
    if (producerAssignmentsResult.error) {
      console.error('Error fetching producer assignments:', producerAssignmentsResult.error);
    } else {
      console.log('Producer assignments count for current week:', producerAssignmentsResult.data[0]);
    }

    // Check schedule_slots table
    console.log('\n=== Schedule Slots ===');
    const scheduleSlotsResult = await query(`
      SELECT COUNT(*) as slot_count 
      FROM schedule_slots 
      WHERE is_deleted = false 
      AND slot_date BETWEEN $1::date AND $2::date
    `, [formattedStartDate, formattedEndDate]);
    
    if (scheduleSlotsResult.error) {
      console.error('Error fetching schedule slots:', scheduleSlotsResult.error);
    } else {
      console.log('Schedule slots count for current week:', scheduleSlotsResult.data[0]);
    }

    // Check master slots
    console.log('\n=== Master Slots ===');
    const masterSlotsResult = await query(`
      SELECT COUNT(*) as master_slot_count 
      FROM schedule_slots 
      WHERE is_deleted = false 
      AND is_master = true
    `);
    
    if (masterSlotsResult.error) {
      console.error('Error fetching master slots:', masterSlotsResult.error);
    } else {
      console.log('Master slots count:', masterSlotsResult.data[0]);
    }

    // Check all work arrangements (not just current week)
    console.log('\n=== All Work Arrangements ===');
    const allWorkArrangementsResult = await query(`
      SELECT type, week_start, filename, created_at 
      FROM work_arrangements 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (allWorkArrangementsResult.error) {
      console.error('Error fetching all work arrangements:', allWorkArrangementsResult.error);
    } else {
      console.log('Recent work arrangements:', allWorkArrangementsResult.data);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugScheduleIssue(); 