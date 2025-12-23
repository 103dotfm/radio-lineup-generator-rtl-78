import { query } from '../../../src/lib/db.js';

export async function up() {
  try {
    // Check if the column already exists
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      AND column_name = 'is_deleted'
    `);

    if (checkResult.data && checkResult.data.length === 0) {
      console.log('Adding is_deleted column to schedule_slots table...');
      
      // Add the is_deleted column with a default value of false
      await query(`
        ALTER TABLE schedule_slots 
        ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false
      `);

      // Create an index for faster lookups
      await query(`
        CREATE INDEX IF NOT EXISTS schedule_slots_is_deleted_idx 
        ON schedule_slots (is_deleted)
      `);

      console.log('Successfully added is_deleted column and index');
    } else {
      console.log('is_deleted column already exists');
    }
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down() {
  try {
    // Check if the column exists before trying to remove it
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      AND column_name = 'is_deleted'
    `);

    if (checkResult.data && checkResult.data.length > 0) {
      console.log('Removing is_deleted column from schedule_slots table...');
      
      // Drop the index first
      await query(`
        DROP INDEX IF EXISTS schedule_slots_is_deleted_idx
      `);

      // Remove the column
      await query(`
        ALTER TABLE schedule_slots 
        DROP COLUMN is_deleted
      `);

      console.log('Successfully removed is_deleted column and index');
    } else {
      console.log('is_deleted column does not exist');
    }
  } catch (error) {
    console.error('Error in rollback:', error);
    throw error;
  }
} 