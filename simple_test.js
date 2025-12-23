const { Pool } = require('pg');

const pool = new Pool({
  user: 'iteam',
  password: 'iteam',
  host: 'localhost',
  port: 5432,
  database: 'radio_lineup'
});

async function test() {
  try {
    console.log('Testing master schedule...');
    
    // Check columns
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'schedule_slots'
    `);
    
    const columnNames = columns.rows.map(col => col.column_name);
    console.log('Columns:', columnNames);
    
    // Check data
    const counts = await pool.query(`
      SELECT 'Master' as type, COUNT(*) as count FROM schedule_slots WHERE is_master = true
      UNION ALL
      SELECT 'Weekly' as type, COUNT(*) as count FROM schedule_slots WHERE is_master = false
    `);
    
    counts.rows.forEach(row => {
      console.log(`${row.type}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test(); 