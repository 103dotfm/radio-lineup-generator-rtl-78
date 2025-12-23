import { query } from './src/lib/db.js';
import { format, startOfWeek, addDays } from 'date-fns';

// Set environment variables for database connection
process.env.DB_TYPE = 'local';
process.env.DB_USER = 'radiouser';
process.env.DB_PASSWORD = 'radio123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'radiodb';

async function testWorkArrangements() {
  try {
    console.log('=== Testing Work Arrangements ===\n');
    
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

    // Check work_arrangements table for current week
    console.log('\n=== Work Arrangements for Current Week ===');
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

    // Check all work arrangements (not just current week)
    console.log('\n=== All Work Arrangements ===');
    const allWorkArrangementsResult = await query(`
      SELECT type, week_start, filename, created_at 
      FROM work_arrangements 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    if (allWorkArrangementsResult.error) {
      console.error('Error fetching all work arrangements:', allWorkArrangementsResult.error);
    } else {
      console.log('Recent work arrangements:', allWorkArrangementsResult.data);
      
      // Check for producers arrangements in all data
      const allProducersArrangements = allWorkArrangementsResult.data.filter(wa => wa.type === 'producers');
      console.log('\nAll producers arrangements:', allProducersArrangements);
    }

    // Check if there are any arrangements for recent weeks
    console.log('\n=== Recent Weeks Work Arrangements ===');
    const recentWeeksResult = await query(`
      SELECT type, week_start, filename, created_at 
      FROM work_arrangements 
      WHERE week_start >= CURRENT_DATE - INTERVAL '4 weeks'
      ORDER BY week_start DESC, created_at DESC
    `);
    
    if (recentWeeksResult.error) {
      console.error('Error fetching recent weeks arrangements:', recentWeeksResult.error);
    } else {
      console.log('Recent weeks work arrangements:', recentWeeksResult.data);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWorkArrangements(); 