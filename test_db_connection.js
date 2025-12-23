import { query } from './src/lib/db.js';

// Set environment variables for database connection
process.env.DB_TYPE = 'local';
process.env.DB_USER = 'radiouser';
process.env.DB_PASSWORD = 'radio123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'radiodb';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const testResult = await query('SELECT NOW() as current_time');
    if (testResult.error) {
      console.error('Database connection failed:', testResult.error);
      return;
    }
    console.log('Database connection successful:', testResult.data[0]);

    // Check current date
    const currentDate = new Date();
    console.log('Current date:', currentDate.toISOString());

    // Check all work arrangements
    console.log('\n=== All Work Arrangements ===');
    const allWorkArrangementsResult = await query(`
      SELECT * FROM work_arrangements 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (allWorkArrangementsResult.error) {
      console.error('Error fetching all work arrangements:', allWorkArrangementsResult.error);
    } else {
      console.log('All work arrangements:', allWorkArrangementsResult.data);
    }

    // Check specifically for producers arrangements
    console.log('\n=== Producers Work Arrangements ===');
    const producersResult = await query(`
      SELECT * FROM work_arrangements 
      WHERE type = 'producers'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (producersResult.error) {
      console.error('Error fetching producers arrangements:', producersResult.error);
    } else {
      console.log('Producers arrangements:', producersResult.data);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection(); 