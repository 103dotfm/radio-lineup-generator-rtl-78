import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Helper function to get database configuration
const getDatabaseConfig = () => {
  const isLocal = process.env.DB_TYPE === 'local';
  
  console.log('Environment variables:', {
    DB_TYPE: process.env.DB_TYPE,
    DB_USER: process.env.DB_USER,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '***' : undefined
  });
  
  const baseConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    allowExitOnIdle: true,
    application_name: 'radio-lineup-generator'
  };
  
  if (isLocal) {
    // Ensure password is a string
    let password = process.env.DB_PASSWORD;
    if (password === undefined || password === null) {
      console.warn('DB_PASSWORD not set, using default password');
      password = 'radio123';
    } else if (typeof password !== 'string') {
      console.warn('DB_PASSWORD is not a string, converting to string');
      password = password.toString();
    }
    
    const config = {
      ...baseConfig,
      user: process.env.DB_USER || 'radiouser',
      password,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'radiodb',
      // Disable SSL for local connections
      ssl: false
    };

    console.log('Local database configuration:', {
      ...config,
      password: '***', // Hide password in logs
      user: config.user,
      host: config.host,
      port: config.port,
      database: config.database
    });
    
    return config;
  }
  
  // Remote database configuration
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing for remote connection');
    throw new Error('DATABASE_URL environment variable is required for remote connections');
  }
  
  return {
    ...baseConfig,
    connectionString,
    ssl: process.env.NODE_ENV === 'production'
  };
};

// Create a new PostgreSQL connection pool
let pool;
try {
  const config = getDatabaseConfig();
  pool = new Pool(config);
  
  // Test the connection immediately
  pool.query('SELECT NOW()', [], (err, res) => {
    if (err) {
      console.error('Initial database connection test failed:', {
        error: err,
        message: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint
      });
    } else {
      console.log('Database connection successful:', {
        timestamp: res.rows[0].now,
        config: {
          ...config,
          password: '***'
        }
      });
    }
  });
} catch (error) {
  console.error('Failed to create database pool:', {
    error,
    message: error.message,
    code: error.code,
    stack: error.stack
  });
  throw error;
}

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', {
    error: err,
    message: err.message,
    code: err.code,
    stack: err.stack,
    detail: err.detail,
    hint: err.hint
  });
  if (client) client.release(true);
});

// Helper function to execute database queries
const query = async (text, params = []) => {
  let client;
  try {
    client = await pool.connect();
    console.log('Executing query:', {
      text,
      params,
      timestamp: new Date().toISOString()
    });
    
    const startTime = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - startTime;
    
    console.log('Query completed:', {
      duration: `${duration}ms`,
      rowCount: result.rowCount,
      timestamp: new Date().toISOString(),
      firstRow: result.rows && result.rows[0] ? JSON.stringify(result.rows[0]).substring(0, 100) + '...' : null
    });
    
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('Database query error:', {
      error,
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      query: text,
      params,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    return { data: null, error };
  } finally {
    if (client) {
      try {
        await client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', {
          error: releaseError,
          message: releaseError.message,
          stack: releaseError.stack
        });
      }
    }
  }
};

// Function to switch database connection
const switchDatabase = async (type) => {
  try {
    // Close existing pool
    await pool.end();
    
    // Update environment variable
    process.env.DB_TYPE = type;
    
    // Create new pool with updated config
    const newConfig = getDatabaseConfig();
    pool = new Pool(newConfig);
    
    // Test new connection
    const testResult = await query('SELECT NOW()');
    if (testResult.error) {
      throw testResult.error;
    }
    
    const dbType = type === 'local' ? 'local' : 'remote';
    console.log(`Successfully switched to ${dbType} database at ${newConfig.host || 'remote host'}`);
    
    return { success: true, message: `Successfully switched to ${type} database` };
  } catch (error) {
    console.error('Error switching database:', error);
    return { success: false, error: error.message };
  }
};

export {
  query,
  pool,
  switchDatabase
}; 