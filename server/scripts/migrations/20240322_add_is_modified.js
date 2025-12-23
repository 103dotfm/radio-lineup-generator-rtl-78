import { query } from '../../../src/lib/db.js';

export async function up() {
  console.log('Running migration: add is_modified column to schedule_slots');

  try {
    // Check if the column already exists
    const checkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'schedule_slots'
      AND column_name = 'is_modified'
    `);

    if (checkResult.data && checkResult.data.length > 0) {
      console.log('is_modified column already exists, skipping migration');
      return;
    }

    // Add the is_modified column
    await query(`
      ALTER TABLE schedule_slots
      ADD COLUMN is_modified BOOLEAN DEFAULT FALSE
    `);

    console.log('Added is_modified column to schedule_slots table');

    // Set is_modified to true for any slot that has been modified from its parent
    await query(`
      UPDATE schedule_slots s
      SET is_modified = true
      FROM schedule_slots p
      WHERE s.parent_slot_id = p.id
      AND (
        s.start_time != p.start_time OR
        s.end_time != p.end_time OR
        s.show_name != p.show_name OR
        s.host_name != p.host_name OR
        s.is_prerecorded != p.is_prerecorded OR
        s.is_collection != p.is_collection OR
        s.color != p.color
      )
    `);

    console.log('Updated is_modified flag for existing slots');

    return true;
  } catch (error) {
    console.error('Error in migration add_is_modified:', error);
    throw error;
  }
}

export async function down() {
  console.log('Running down migration: remove is_modified column');

  try {
    // Remove the is_modified column
    await query(`
      ALTER TABLE schedule_slots
      DROP COLUMN IF EXISTS is_modified
    `);

    console.log('Removed is_modified column from schedule_slots table');
    return true;
  } catch (error) {
    console.error('Error in down migration remove_is_modified:', error);
    throw error;
  }
} 