import { query } from '../../../src/lib/db.js';

export async function up() {
  try {
    // Check if slot_date column exists
    const { data: columnInfo } = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      AND column_name = 'slot_date'
    `);

    if (!columnInfo || columnInfo.length === 0) {
      // Add slot_date column if it doesn't exist
      await query(`
        ALTER TABLE schedule_slots 
        ADD COLUMN slot_date DATE NOT NULL DEFAULT CURRENT_DATE
      `);

      // Create index for slot_date
      await query(`
        CREATE INDEX IF NOT EXISTS schedule_slots_date_idx 
        ON schedule_slots(slot_date)
      `);

      console.log('Added slot_date column to schedule_slots table');
    } else {
      console.log('slot_date column already exists');
    }
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down() {
  try {
    // Remove slot_date column and its index
    await query(`
      DROP INDEX IF EXISTS schedule_slots_date_idx;
      ALTER TABLE schedule_slots DROP COLUMN IF EXISTS slot_date;
    `);
    
    console.log('Removed slot_date column from schedule_slots table');
  } catch (error) {
    console.error('Error in rollback:', error);
    throw error;
  }
} 