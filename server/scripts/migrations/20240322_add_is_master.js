import { query } from '../../../src/lib/db.js';

export async function up() {
  try {
    // Check if is_master column exists
    const { data: columnInfo } = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      AND column_name = 'is_master'
    `);

    if (!columnInfo || columnInfo.length === 0) {
      // Add is_master column if it doesn't exist
      await query(`
        ALTER TABLE schedule_slots 
        ADD COLUMN is_master BOOLEAN DEFAULT false
      `);

      // Create index for is_master
      await query(`
        CREATE INDEX IF NOT EXISTS schedule_slots_is_master_idx 
        ON schedule_slots(is_master)
      `);

      console.log('Added is_master column to schedule_slots table');
    } else {
      console.log('is_master column already exists');
    }
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down() {
  try {
    // Remove is_master column and its index
    await query(`
      DROP INDEX IF EXISTS schedule_slots_is_master_idx;
      ALTER TABLE schedule_slots DROP COLUMN IF EXISTS is_master;
    `);
    
    console.log('Removed is_master column from schedule_slots table');
  } catch (error) {
    console.error('Error in rollback:', error);
    throw error;
  }
} 