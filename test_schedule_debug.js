import { query } from './src/lib/db.js';
import { format, startOfWeek, addDays } from 'date-fns';

// Set environment variables for database connection
process.env.DB_TYPE = 'local';
process.env.DB_USER = 'radiouser';
process.env.DB_PASSWORD = 'radio123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'radiodb';

async function testScheduleDebug() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const testResult = await query('SELECT NOW() as current_time');
    if (testResult.error) {
      console.error('Database connection failed:', testResult.error);
      return;
    }
    console.log('Database connection successful:', testResult.data[0]);

    // Check current week
    const currentDate = new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    const formattedStartDate = format(weekStart, 'yyyy-MM-dd');
    const formattedEndDate = format(weekEnd, 'yyyy-MM-dd');
    
    console.log('Current week:', { weekStart: formattedStartDate, weekEnd: formattedEndDate });

    // Check work arrangements
    console.log('\nChecking work arrangements...');
    const arrangementsResult = await query(`
      SELECT * FROM work_arrangements 
      WHERE week_start = $1 
      ORDER BY created_at DESC
    `, [formattedStartDate]);
    
    if (arrangementsResult.error) {
      console.error('Error fetching work arrangements:', arrangementsResult.error);
    } else {
      console.log('Work arrangements for current week:', arrangementsResult.data);
    }

    // Check schedule slots for current week
    console.log('\nChecking schedule slots for current week...');
    const slotsResult = await query(`
      SELECT COUNT(*) as slot_count 
      FROM schedule_slots 
      WHERE is_deleted = false 
      AND slot_date BETWEEN $1::date AND $2::date
    `, [formattedStartDate, formattedEndDate]);
    
    if (slotsResult.error) {
      console.error('Error fetching schedule slots:', slotsResult.error);
    } else {
      console.log('Schedule slots count for current week:', slotsResult.data[0]);
    }

    // Check master slots
    console.log('\nChecking master slots...');
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

    // Check if there are any slots at all
    console.log('\nChecking total slots...');
    const totalSlotsResult = await query(`
      SELECT COUNT(*) as total_slots 
      FROM schedule_slots 
      WHERE is_deleted = false
    `);
    
    if (totalSlotsResult.error) {
      console.error('Error fetching total slots:', totalSlotsResult.error);
    } else {
      console.log('Total slots in database:', totalSlotsResult.data[0]);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScheduleDebug(); 