import { query } from '../../../src/lib/db.js';

export async function up() {
  try {
    // Create new schedule_slots table
    await query(`
      CREATE TABLE IF NOT EXISTS schedule_slots (
        id SERIAL PRIMARY KEY,
        date DATE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        show_name TEXT NOT NULL,
        host_name TEXT,
        has_lineup BOOLEAN DEFAULT false,
        color TEXT DEFAULT 'green',
        is_prerecorded BOOLEAN DEFAULT false,
        is_collection BOOLEAN DEFAULT false,
        is_master BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for faster date lookups
      CREATE INDEX IF NOT EXISTS schedule_slots_date_idx ON schedule_slots(date);
      CREATE INDEX IF NOT EXISTS schedule_slots_is_master_idx ON schedule_slots(is_master);
    `);

    // Migrate data from old table if it exists
    await query(`
      INSERT INTO schedule_slots (
        start_time, end_time, show_name, host_name, has_lineup,
        color, is_prerecorded, is_collection, is_master, is_deleted
      )
      SELECT 
        start_time, end_time, show_name, host_name, has_lineup,
        color, is_prerecorded, is_collection, false, is_deleted
      FROM schedule_slots_old
      WHERE NOT is_deleted
      ON CONFLICT DO NOTHING;
    `);

    console.log('Schedule slots migration completed successfully');
  } catch (error) {
    console.error('Error in schedule slots migration:', error);
    throw error;
  }
}

export async function down() {
  try {
    await query('DROP TABLE IF EXISTS schedule_slots;');
    console.log('Schedule slots rollback completed successfully');
  } catch (error) {
    console.error('Error in schedule slots rollback:', error);
    throw error;
  }
} 