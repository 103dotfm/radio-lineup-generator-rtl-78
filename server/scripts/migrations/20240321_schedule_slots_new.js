import { query } from '../../../src/lib/db.js';
import { startOfWeek, addDays, format } from 'date-fns';

export async function up() {
  try {
    // Create new schedule_slots table
    await query(`
      CREATE TABLE IF NOT EXISTS schedule_slots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slot_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        show_name TEXT NOT NULL,
        host_name TEXT,
        has_lineup BOOLEAN DEFAULT false,
        color TEXT DEFAULT 'green',
        is_prerecorded BOOLEAN DEFAULT false,
        is_collection BOOLEAN DEFAULT false,
        is_master BOOLEAN DEFAULT false,
        parent_slot_id UUID REFERENCES schedule_slots(id),
        is_deleted BOOLEAN DEFAULT false,
        day_of_week INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for faster lookups
      CREATE INDEX IF NOT EXISTS schedule_slots_date_idx ON schedule_slots(slot_date);
      CREATE INDEX IF NOT EXISTS schedule_slots_is_master_idx ON schedule_slots(is_master);
      CREATE INDEX IF NOT EXISTS schedule_slots_parent_slot_id_idx ON schedule_slots(parent_slot_id);
      CREATE INDEX IF NOT EXISTS schedule_slots_day_of_week_idx ON schedule_slots(day_of_week);
    `);

    // Migrate data from old table
    const { data: oldSlots } = await query(`
      SELECT * FROM schedule_slots_old 
      WHERE NOT is_deleted
      ORDER BY day_of_week, start_time
    `);

    if (oldSlots && oldSlots.length > 0) {
      // Get the current week's start date
      const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      
      // Process each old slot
      for (const oldSlot of oldSlots) {
        // Create master slot if it's recurring
        if (oldSlot.is_recurring) {
          const { data: masterSlot } = await query(
            `INSERT INTO schedule_slots (
              slot_date, start_time, end_time, show_name, host_name,
              has_lineup, color, is_prerecorded, is_collection,
              is_master, day_of_week, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, CURRENT_TIMESTAMP
            ) RETURNING *`,
            [
              format(currentWeekStart, 'yyyy-MM-dd'), // Use current week start as base date
              oldSlot.start_time,
              oldSlot.end_time,
              oldSlot.show_name,
              oldSlot.host_name,
              oldSlot.has_lineup,
              oldSlot.color,
              oldSlot.is_prerecorded,
              oldSlot.is_collection,
              oldSlot.day_of_week
            ]
          );

          // Create instances for the next 4 weeks
          for (let week = 0; week < 4; week++) {
            const weekDate = addDays(currentWeekStart, week * 7 + oldSlot.day_of_week);
            await query(
              `INSERT INTO schedule_slots (
                slot_date, start_time, end_time, show_name, host_name,
                has_lineup, color, is_prerecorded, is_collection,
                is_master, parent_slot_id, day_of_week, created_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, CURRENT_TIMESTAMP
              )`,
              [
                format(weekDate, 'yyyy-MM-dd'),
                oldSlot.start_time,
                oldSlot.end_time,
                oldSlot.show_name,
                oldSlot.host_name,
                oldSlot.has_lineup,
                oldSlot.color,
                oldSlot.is_prerecorded,
                oldSlot.is_collection,
                masterSlot.id,
                oldSlot.day_of_week
              ]
            );
          }
        } else {
          // For non-recurring slots, just create a single instance
          const slotDate = addDays(currentWeekStart, oldSlot.day_of_week);
          await query(
            `INSERT INTO schedule_slots (
              slot_date, start_time, end_time, show_name, host_name,
              has_lineup, color, is_prerecorded, is_collection,
              is_master, day_of_week, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, CURRENT_TIMESTAMP
            )`,
            [
              format(slotDate, 'yyyy-MM-dd'),
              oldSlot.start_time,
              oldSlot.end_time,
              oldSlot.show_name,
              oldSlot.host_name,
              oldSlot.has_lineup,
              oldSlot.color,
              oldSlot.is_prerecorded,
              oldSlot.is_collection,
              oldSlot.day_of_week
            ]
          );
        }
      }
    }

    console.log('Schedule slots migration completed successfully');
  } catch (error) {
    console.error('Error in schedule slots migration:', error);
    throw error;
  }
}

export async function down() {
  try {
    // Drop the new table and its indexes
    await query(`
      DROP INDEX IF EXISTS schedule_slots_date_idx;
      DROP INDEX IF EXISTS schedule_slots_is_master_idx;
      DROP INDEX IF EXISTS schedule_slots_parent_slot_id_idx;
      DROP INDEX IF EXISTS schedule_slots_day_of_week_idx;
      DROP TABLE IF EXISTS schedule_slots;
    `);
    
    console.log('Schedule slots rollback completed successfully');
  } catch (error) {
    console.error('Error in schedule slots rollback:', error);
    throw error;
  }
} 