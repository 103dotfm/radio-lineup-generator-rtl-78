import { query } from './src/lib/db.js';
import { format, startOfWeek, addDays } from 'date-fns';

// Set environment variables for database connection
process.env.DB_TYPE = 'local';
process.env.DB_USER = 'radiouser';
process.env.DB_PASSWORD = 'radio123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'radiodb';

async function comprehensiveTest() {
  try {
    console.log('=== Comprehensive Producers Work Arrangement Test ===\n');
    
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
    console.log('Current date:', currentDate.toISOString());
    console.log('Week start:', formattedStartDate);
    console.log('Week end:', formattedEndDate);

    // Check work_arrangements table (PDF files)
    console.log('\n=== Work Arrangements (PDF files) ===');
    const workArrangementsResult = await query(`
      SELECT * FROM work_arrangements 
      WHERE type = 'producers'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (workArrangementsResult.error) {
      console.error('Error fetching work arrangements:', workArrangementsResult.error);
    } else {
      console.log('Producers work arrangements (PDF files):', workArrangementsResult.data);
    }

    // Check producer_assignments table (detailed assignments)
    console.log('\n=== Producer Assignments (Detailed) ===');
    const producerAssignmentsResult = await query(`
      SELECT * FROM producer_assignments 
      WHERE week_start = $1 AND is_deleted = false
      ORDER BY created_at DESC
    `, [formattedStartDate]);
    
    if (producerAssignmentsResult.error) {
      console.error('Error fetching producer assignments:', producerAssignmentsResult.error);
    } else {
      console.log('Producer assignments for current week:', producerAssignmentsResult.data);
    }

    // Check all producer assignments (not just current week)
    console.log('\n=== All Producer Assignments ===');
    const allProducerAssignmentsResult = await query(`
      SELECT week_start, COUNT(*) as assignment_count 
      FROM producer_assignments 
      WHERE is_deleted = false
      GROUP BY week_start 
      ORDER BY week_start DESC 
      LIMIT 10
    `);
    
    if (allProducerAssignmentsResult.error) {
      console.error('Error fetching all producer assignments:', allProducerAssignmentsResult.error);
    } else {
      console.log('All producer assignments by week:', allProducerAssignmentsResult.data);
    }

    // Check producer_work_arrangements table
    console.log('\n=== Producer Work Arrangements ===');
    const producerWorkArrangementsResult = await query(`
      SELECT * FROM producer_work_arrangements 
      WHERE week_start = $1
      ORDER BY created_at DESC
    `, [formattedStartDate]);
    
    if (producerWorkArrangementsResult.error) {
      console.error('Error fetching producer work arrangements:', producerWorkArrangementsResult.error);
    } else {
      console.log('Producer work arrangements for current week:', producerWorkArrangementsResult.data);
    }

    // Check if there are any workers in the producers division
    console.log('\n=== Producers Division Workers ===');
    const producersWorkersResult = await query(`
      SELECT * FROM workers 
      WHERE department ILIKE '%מפיקים%' 
         OR department ILIKE '%מפיק%' 
         OR department ILIKE '%הפקה%' 
         OR department ILIKE '%producers%'
      ORDER BY name
    `);
    
    if (producersWorkersResult.error) {
      console.error('Error fetching producers workers:', producersWorkersResult.error);
    } else {
      console.log('Producers division workers:', producersWorkersResult.data);
    }

    // Check schedule slots for current week
    console.log('\n=== Schedule Slots for Current Week ===');
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

  } catch (error) {
    console.error('Test failed:', error);
  }
}

comprehensiveTest(); 