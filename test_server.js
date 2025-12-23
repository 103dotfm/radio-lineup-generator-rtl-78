import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

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
try {
  const { pool } = await import('./src/lib/db.js');
  console.log('Database pool created successfully');
  
  const client = await pool.connect();
  console.log('Database connection successful');
  
  const result = await client.query('SELECT NOW() as current_time');
  console.log('Database query successful:', result.rows[0]);
  
  client.release();
  console.log('Database client released');
  
} catch (error) {
  console.error('Database connection failed:', error.message);
  console.error('Error details:', error);
}

// Test server startup
try {
  console.log('\nTesting server startup...');
  const { default: app } = await import('./server/server.js');
  console.log('Server app imported successfully');
} catch (error) {
  console.error('Server startup failed:', error.message);
  console.error('Error details:', error);
} 