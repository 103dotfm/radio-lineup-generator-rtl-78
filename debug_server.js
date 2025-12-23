import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

console.log('=== DEBUG SERVER STARTUP ===');
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_TYPE:', process.env.DB_TYPE);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

// Test database connection
async function testDatabase() {
  try {
    console.log('\n=== TESTING DATABASE CONNECTION ===');
    
    const config = {
      user: process.env.DB_USER || 'radiouser',
      password: process.env.DB_PASSWORD || 'radio123',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'radiodb',
      ssl: false
    };
    
    console.log('Database config:', {
      ...config,
      password: '***'
    });
    
    const pool = new Pool(config);
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database query successful:', result.rows[0]);
    
    // Check if schedule_slots table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule_slots'
      ) as table_exists
    `);
    
    console.log('✅ Table check result:', tableCheck.rows[0]);
    
    if (tableCheck.rows[0].table_exists) {
      // Check table structure
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'schedule_slots' 
        ORDER BY ordinal_position
      `);
      
      console.log('✅ Table structure:');
      structure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check row count
      const count = await client.query('SELECT COUNT(*) as count FROM schedule_slots');
      console.log('✅ Row count:', count.rows[0].count);
    } else {
      console.log('❌ schedule_slots table does not exist');
    }
    
    client.release();
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    return false;
  }
}

// Test server startup
async function testServer() {
  try {
    console.log('\n=== TESTING SERVER STARTUP ===');
    
    // Test importing the server
    const { default: app } = await import('./server/server.js');
    console.log('✅ Server app imported successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Starting debug tests...\n');
  
  const dbSuccess = await testDatabase();
  const serverSuccess = await testServer();
  
  console.log('\n=== TEST RESULTS ===');
  console.log('Database connection:', dbSuccess ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Server startup:', serverSuccess ? '✅ SUCCESS' : '❌ FAILED');
  
  if (!dbSuccess) {
    console.log('\n=== DATABASE TROUBLESHOOTING ===');
    console.log('1. Check if PostgreSQL is running: sudo systemctl status postgresql');
    console.log('2. Check if database exists: sudo -u postgres psql -c "\\l"');
    console.log('3. Check if user exists: sudo -u postgres psql -c "\\du"');
    console.log('4. Check if table exists: sudo -u postgres psql -d radiodb -c "\\dt"');
  }
  
  if (!serverSuccess) {
    console.log('\n=== SERVER TROUBLESHOOTING ===');
    console.log('1. Check if all dependencies are installed: npm install');
    console.log('2. Check if environment variables are set correctly');
    console.log('3. Check server logs for specific errors');
  }
}

runTests().catch(console.error); 