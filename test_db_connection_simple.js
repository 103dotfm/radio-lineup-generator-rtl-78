import pg from 'pg';

const { Pool } = pg;

const config = {
  user: 'radiouser',
  password: 'radio123',
  host: 'localhost',
  port: 5432,
  database: 'radiodb',
  ssl: false
};

console.log('Testing database connection...');
console.log('Config:', { ...config, password: '***' });

const pool = new Pool(config);

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connection successful:', res.rows[0]);
  }
  pool.end();
}); 