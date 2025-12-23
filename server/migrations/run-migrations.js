import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { query } from '../../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const files = await fs.readdir(__dirname);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));

    // Sort files to ensure consistent order
    sqlFiles.sort();

    // Get executed migrations
    const { data: executedMigrations } = await query('SELECT name FROM migrations');
    const executedMigrationNames = new Set(executedMigrations.map(m => m.name));

    // Run each migration that hasn't been executed yet
    for (const file of sqlFiles) {
      if (!executedMigrationNames.has(file)) {
        console.log(`Running migration: ${file}`);
        
        // Read and execute migration file
        const filePath = join(__dirname, file);
        const sql = await fs.readFile(filePath, 'utf8');
        
        // Run migration in a transaction
        await query('BEGIN');
        try {
          await query(sql);
          await query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await query('COMMIT');
          console.log(`Successfully executed migration: ${file}`);
        } catch (error) {
          await query('ROLLBACK');
          throw error;
        }
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations(); 