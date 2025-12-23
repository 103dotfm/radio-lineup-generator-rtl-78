import { query } from '../../../src/lib/db.js';

export async function up() {
  try {
    // Check if parent_slot_id column exists
    const { data: columnInfo } = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      AND column_name = 'parent_slot_id'
    `);

    if (!columnInfo || columnInfo.length === 0) {
      // Add parent_slot_id column if it doesn't exist
      await query(`
        ALTER TABLE schedule_slots 
        ADD COLUMN parent_slot_id UUID REFERENCES schedule_slots(id)
      `);

      // Create index for parent_slot_id
      await query(`
        CREATE INDEX IF NOT EXISTS schedule_slots_parent_slot_id_idx 
        ON schedule_slots(parent_slot_id)
      `);

      console.log('Added parent_slot_id column to schedule_slots table');
    } else {
      console.log('parent_slot_id column already exists');
    }
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down() {
  try {
    // Remove parent_slot_id column and its index
    await query(`
      DROP INDEX IF EXISTS schedule_slots_parent_slot_id_idx;
      ALTER TABLE schedule_slots DROP COLUMN IF EXISTS parent_slot_id;
    `);
    
    console.log('Removed parent_slot_id column from schedule_slots table');
  } catch (error) {
    console.error('Error in rollback:', error);
    throw error;
  }
} 