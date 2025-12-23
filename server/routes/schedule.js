import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import xml2js from 'xml2js';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to get a date by day of week
function getDateByDayOfWeek(baseDate, dayOfWeek) {
  const currentDate = new Date(baseDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // 0 = Sunday
  return addDays(weekStart, dayOfWeek);
}

// Get schedule slots
router.get('/slots', async (req, res) => {
  try {
    const { selectedDate, isMasterSchedule } = req.query;
    console.log('Fetching slots with params:', { selectedDate, isMasterSchedule });
    
    let queryStr;
    let params = [];

    // Convert isMasterSchedule to boolean
    const isMaster = isMasterSchedule === 'true' || isMasterSchedule === true;
    console.log('isMaster:', isMaster);

    if (isMaster) {
      // Master schedule: fetch only master slots (no date filtering)
      queryStr = `
        SELECT 
          s.id, s.start_time, s.end_time, s.show_name, s.host_name,
          s.has_lineup, s.color, s.is_prerecorded, s.is_collection, s.is_master,
          s.day_of_week, s.is_recurring, s.created_at, s.updated_at,
          s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated,
          COALESCE(
            (SELECT json_agg(sh.*) 
             FROM shows sh 
             WHERE sh.slot_id = s.id), 
            '[]'::json
          ) as shows
        FROM schedule_slots s
        WHERE s.is_deleted = false 
        AND s.is_master = true
        ORDER BY s.day_of_week, s.start_time
      `;
    } else {
      // Weekly schedule: fetch slots for the selected week with proper inheritance
      if (!selectedDate) {
        console.error('selectedDate is required for weekly schedule');
        return res.status(400).json({ error: 'selectedDate is required for weekly schedule' });
      }

      const weekStartDate = startOfWeek(new Date(selectedDate), { weekStartsOn: 0 });
      const weekEndDate = addDays(weekStartDate, 6);
      
      // Format dates for SQL query
      const formattedStartDate = format(weekStartDate, 'yyyy-MM-dd');
      const formattedEndDate = format(weekEndDate, 'yyyy-MM-dd');
      
      console.log('Weekly schedule date range:', { 
        selectedDate,
        weekStartDate: weekStartDate.toISOString(),
        weekEndDate: weekEndDate.toISOString(),
        formattedStartDate, 
        formattedEndDate
      });
      
      // Calculate week dates for each day of the week
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        weekDates.push(format(addDays(weekStartDate, i), 'yyyy-MM-dd'));
      }
      
      console.log('Week dates for query:', weekDates);
      
      // Query for weekly schedule: get actual weekly slots + generate virtual instances from master
      // Virtual instances inherit all master slot attributes including color overrides
      queryStr = `
        WITH weekly_slots AS (
          -- Get actual weekly slots (overrides and custom slots)
          SELECT 
            s.id, s.slot_date, s.start_time, s.end_time, s.show_name, s.host_name,
            s.has_lineup, s.color, s.is_prerecorded, s.is_collection, s.is_master,
            s.parent_slot_id, s.day_of_week, s.is_recurring, s.created_at, s.updated_at,
            s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated
          FROM schedule_slots s
          WHERE s.is_deleted = false 
          AND s.slot_date BETWEEN $1::date AND $2::date
          AND s.is_master = false
        ),
        master_slots AS (
          -- Get master slots that should appear this week
          SELECT 
            m.id, m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            m.day_of_week, m.is_recurring, m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM schedule_slots m
          WHERE m.is_deleted = false 
          AND m.is_master = true
        ),
        master_instances AS (
          -- Generate virtual instances for master slots that don't have overrides this week
          -- These inherit ALL attributes from master slots including color overrides
          SELECT 
            gen_random_uuid() as id,
            $3::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 0
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $3::date
          )
          
          UNION ALL
          
          SELECT 
            gen_random_uuid() as id,
            $4::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 1
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $4::date
          )
          
          UNION ALL
          
          SELECT 
            gen_random_uuid() as id,
            $5::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 2
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $5::date
          )
          
          UNION ALL
          
          SELECT 
            gen_random_uuid() as id,
            $6::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 3
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $6::date
          )
          
          UNION ALL
          
          SELECT 
            gen_random_uuid() as id,
            $7::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 4
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $7::date
          )
          
          UNION ALL
          
          SELECT 
            gen_random_uuid() as id,
            $8::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 5
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $8::date
          )
          
          UNION ALL
          
          SELECT 
            gen_random_uuid() as id,
            $9::date as slot_date,
            m.start_time, m.end_time, m.show_name, m.host_name,
            m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
            false as is_master,
            m.id as parent_slot_id, m.day_of_week, m.is_recurring,
            m.created_at, m.updated_at,
            m.rds_pty, m.rds_ms, m.rds_radio_text, m.rds_radio_text_translated
          FROM master_slots m
          WHERE m.day_of_week = 6
          AND NOT EXISTS (
            SELECT 1 FROM schedule_slots s 
            WHERE s.parent_slot_id = m.id AND s.slot_date = $9::date
          )
        ),
        combined_slots AS (
          SELECT * FROM (
            SELECT * FROM weekly_slots
            UNION ALL
            SELECT * FROM master_instances
          ) all_slots
        )
        SELECT 
          cs.*,
          COALESCE(
            (SELECT json_agg(sh.*) 
             FROM shows sh 
             WHERE sh.slot_id = cs.id), 
            '[]'::json
          ) as shows
        FROM combined_slots cs
        ORDER BY slot_date, start_time
      `;
      params = [formattedStartDate, formattedEndDate, ...weekDates];
    }

    console.log('Executing query:', { queryStr, params });
    const result = await query(queryStr, params);
    if (result.error) {
      console.error('Database error:', result.error);
      throw result.error;
    }

    console.log('Query result:', { 
      rowCount: result.data?.length,
      firstRow: result.data?.[0],
      lastRow: result.data?.[result.data.length - 1]
    });

    // Add more detailed logging for debugging
    if (result.data && result.data.length > 0) {
      console.log('Sample slots from query:');
      result.data.slice(0, 5).forEach((slot, index) => {
        console.log(`  ${index + 1}. ${slot.show_name} - ${slot.slot_date} ${slot.start_time}-${slot.end_time} (master: ${slot.is_master}, parent: ${slot.parent_slot_id})`);
      });
    } else {
      console.log('No slots returned from query');
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching schedule slots:', error);
    res.status(500).json({ error: 'Failed to fetch schedule slots' });
  }
});

// Create schedule slot
router.post('/slots', async (req, res) => {
  try {
    const {
      slot_date,
      start_time,
      end_time,
      show_name,
      host_name,
      has_lineup = false,
      color = null,
      is_prerecorded = false,
      is_collection = false,
      isMasterSchedule = false,
      selectedDate,
      day_of_week,
      parent_slot_id = null,
      is_recurring = false,
      is_deleted = false,
      rds_pty = 1,
      rds_ms = 0,
      rds_radio_text = '',
      rds_radio_text_translated = ''
    } = req.body;

    console.log('Creating slot with data:', {
      start_time, end_time, show_name, host_name, has_lineup, color,
      is_prerecorded, is_collection, slot_date, selectedDate, isMasterSchedule, is_master: isMasterSchedule, day_of_week, is_recurring,
      rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated
    });
    
    // Validate RDS fields for better RDS module integration
    if (!rds_radio_text && !rds_radio_text_translated) {
      console.warn('Warning: No RDS radio text provided for slot. RDS module may show empty data.');
    }

    // Convert isMasterSchedule to boolean for clarity
    const is_master = isMasterSchedule === true || isMasterSchedule === 'true';
    
    // Calculate slot_date if not provided (for weekly slots created from virtual slot edits)
    let final_slot_date = slot_date;
    if (!is_master && !final_slot_date && selectedDate && day_of_week !== undefined) {
      // Calculate the slot_date based on selectedDate and day_of_week
      const selectedDateObj = new Date(selectedDate);
      const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 0 });
      const targetDate = addDays(weekStart, parseInt(day_of_week));
      final_slot_date = format(targetDate, 'yyyy-MM-dd');
      console.log(`Calculated slot_date from selectedDate and day_of_week: ${final_slot_date} (selectedDate: ${selectedDate}, day_of_week: ${day_of_week})`);
    }
    
    // Validate that weekly slots have a slot_date
    if (!is_master && !final_slot_date) {
      console.error('slot_date is required for weekly schedule slots');
      return res.status(400).json({ 
        error: 'slot_date is required for weekly schedule slots. Provide either slot_date or selectedDate with day_of_week.' 
      });
    }

    if (is_master) {
      // MASTER SCHEDULE: Create a master slot
      console.log('Creating master schedule slot');
      
      // Check if master slot already exists for this day and time
      const existingMasterSlot = await query(
        `SELECT id FROM schedule_slots 
         WHERE day_of_week = $1 
         AND start_time = $2 
         AND is_master = true 
         AND is_deleted = false`,
        [day_of_week, start_time]
      );
      
      if (existingMasterSlot.error) {
        console.error('Error checking for existing master slot:', existingMasterSlot.error);
        throw existingMasterSlot.error;
      }
      
      if (existingMasterSlot.data && existingMasterSlot.data.length > 0) {
        console.log('Master slot already exists:', existingMasterSlot.data[0]);
        return res.status(400).json({ error: 'A master slot already exists for this day and time' });
      }
      
      // Create the master slot (no specific date, just day_of_week)
      const result = await query(
        `INSERT INTO schedule_slots (
          slot_date, start_time, end_time, show_name, host_name,
          has_lineup, color, is_prerecorded, is_collection,
          is_master, day_of_week, is_recurring, is_deleted, created_at,
          rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated
        ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, false, CURRENT_TIMESTAMP, $11, $12, $13, $14)
        RETURNING id, start_time, end_time, show_name, host_name,
          has_lineup, color, is_prerecorded, is_collection,
          is_master, day_of_week, is_recurring, created_at, updated_at,
          rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated`,
        [
          start_time,
          end_time,
          show_name,
          host_name,
          has_lineup,
          color || 'green',
          is_prerecorded || false,
          is_collection || false,
          day_of_week,
          is_recurring || false,
          rds_pty,
          rds_ms,
          rds_radio_text,
          rds_radio_text_translated
        ]
      );
      
      if (result.error) {
        console.error('Error creating master slot:', result.error);
        throw result.error;
      }

      const masterSlot = result.data[0];
      console.log('Master slot created:', masterSlot);

      // Create weekly instances for current and future weeks only
      const currentDate = new Date();
      const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      
      console.log('Creating weekly instances for master slot from current week onwards');
      
      // Create instances for current week and next 12 weeks (current week + 12 future weeks = 13 total)
      for (let i = 0; i <= 12; i++) {
        const futureWeekStart = addDays(currentWeekStart, i * 7);
        const slotDate = addDays(futureWeekStart, parseInt(day_of_week));
        const futureDate = format(slotDate, 'yyyy-MM-dd');
        
        // Skip if this date is in the past
        if (slotDate < currentDate) {
          console.log(`Skipping past date: ${futureDate}`);
          continue;
        }
        
        console.log(`Creating instance for week ${i}, day ${day_of_week} (${futureDate})`);
        
        try {
          const weeklySlotResult = await query(
            `INSERT INTO schedule_slots (
              slot_date, start_time, end_time, show_name, host_name,
              has_lineup, color, is_prerecorded, is_collection,
              is_master, day_of_week, parent_slot_id, is_recurring, is_deleted, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, false, CURRENT_TIMESTAMP)
            RETURNING id`,
            [
              futureDate,
              start_time,
              end_time,
              show_name,
              host_name,
              has_lineup,
              color || 'green',
              is_prerecorded || false,
              is_collection || false,
              day_of_week,
              masterSlot.id,
              is_recurring || false
            ]
          );
          
          if (weeklySlotResult.error) {
            console.error('Error creating weekly instance:', weeklySlotResult.error);
          } else {
            console.log('Created weekly instance with ID:', weeklySlotResult.data[0].id);
          }
        } catch (error) {
          console.error(`Error creating instance for week ${i}:`, error);
        }
      }
      
    } else {
      console.log('Creating weekly schedule slot');
      
      // Check for existing slot at the same day and start time (skip for deletion overrides)
      if (!is_deleted) {
        const existingSlotCheck = await query(
          `SELECT id FROM schedule_slots 
           WHERE slot_date = $1 
           AND day_of_week = $2
           AND start_time = $3 
           AND is_master = false 
           AND is_deleted = false`,
          [final_slot_date, day_of_week, start_time]
        );

        if (existingSlotCheck.error) {
          console.error('Error checking for existing slot:', existingSlotCheck.error);
        }

        if (existingSlotCheck.data && existingSlotCheck.data.length > 0) {
          console.log(`Found existing slot with ID: ${existingSlotCheck.data[0].id}`);
          return res.status(409).json({
            error: 'A slot already exists for this date, day and start time'
          });
        }
      } else {
        console.log('Skipping existing slot check for deletion override');
      }

      // Check for overlapping slots (skip for deleted slots)
      if (!is_deleted) {
        const overlapCheck = await query(
          `SELECT id FROM schedule_slots 
             WHERE slot_date = $1 
             AND day_of_week = $2
             AND is_master = false 
             AND is_deleted = false
             AND (start_time < $4 AND end_time > $3)`,
          [final_slot_date, day_of_week, start_time, end_time]
        );

        if (overlapCheck.error) {
          console.error('Error checking for overlapping slots:', overlapCheck.error);
        }

        if (overlapCheck.data && overlapCheck.data.length > 0) {
          console.log(`Found overlapping slot with ID: ${overlapCheck.data[0].id}`);
          return res.status(409).json({
            error: 'Time conflict: Slot overlaps with existing slot'
          });
        }
      } else {
        console.log('Skipping overlap check for deleted slot');
      }

      // Broader check for any potential conflicting slots (only weekly slots for weekly schedule)
      console.log('Performing broader conflict check for weekly slots only...');
      const broadConflictCheck = await query(
        `SELECT id, show_name, start_time, end_time, is_master, slot_date FROM schedule_slots 
         WHERE day_of_week = $1
         AND is_master = false
         AND slot_date = $4
         AND (start_time <= $3 AND end_time > $2)
         AND is_deleted = false`,
        [day_of_week, start_time, end_time, final_slot_date]
      );

      if (broadConflictCheck.error) {
        console.error('Error in broad conflict check:', broadConflictCheck.error);
      } else if (broadConflictCheck.data && broadConflictCheck.data.length > 0) {
        console.log('Potential conflicting slots found in broad check:', broadConflictCheck.data);
      } else {
        console.log('No potential conflicting slots found in broad check.');
      }

      try {
        // Direct insert without the complex temporary slot logic
        console.log('Creating weekly slot directly...');
        const insertResult = await query(
          `INSERT INTO schedule_slots (
            slot_date, start_time, end_time, show_name, host_name,
            has_lineup, color, is_prerecorded, is_collection,
            is_master, day_of_week, parent_slot_id, is_recurring, is_deleted, created_at,
            rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, $13, CURRENT_TIMESTAMP, $14, $15, $16, $17)
          RETURNING id, slot_date, start_time, end_time, show_name, host_name,
            has_lineup, color, is_prerecorded, is_collection,
            is_master, day_of_week, parent_slot_id, is_recurring, created_at, updated_at,
            rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated`,
          [
            final_slot_date, start_time, end_time, show_name, host_name,
            has_lineup, color, is_prerecorded, is_collection,
            day_of_week, parent_slot_id, is_recurring, is_deleted,
            rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated
          ]
        );

        if (insertResult.error) {
          console.error('Database query error during insert:', insertResult.error);
          return res.status(500).json({
            error: 'Failed to create weekly slot',
            details: insertResult.error.message
          });
        }

        if (insertResult.data && insertResult.data.length > 0) {
          console.log(`Successfully created slot with ID: ${insertResult.data[0].id}`);
          return res.status(201).json(insertResult.data[0]);
        } else {
          return res.status(500).json({
            error: 'Failed to create slot: No data returned'
          });
        }
      } catch (error) {
        console.error('Error creating weekly slot:', error);
        return res.status(500).json({
          error: 'Failed to create weekly slot',
          details: error.message
        });
      }
    }
  } catch (error) {
    console.error('Error creating schedule slot:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update schedule slot
router.put('/slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isMasterSchedule, slot_date, selectedDate, ...updates } = req.body;
    
    // Convert isMasterSchedule to boolean for clarity
    const is_master = isMasterSchedule === true || isMasterSchedule === 'true';
    
    console.log('Updating slot:', { 
      id, 
      isMasterSchedule, 
      is_master, 
      slot_date,
      selectedDate: selectedDate ? selectedDate : 'not provided',
      updates 
    });
    
    // Get the original slot
    const originalSlot = await query(
      'SELECT * FROM schedule_slots WHERE id = $1 AND is_deleted = false',
      [id]
    );

    if (originalSlot.error || !originalSlot.data.length) {
      console.log('Slot not found in database, checking if it\'s a virtual slot:', { id });
      
      // This might be a virtual slot (generated on-the-fly from master schedule)
      // Virtual slots are created with gen_random_uuid() in the weekly schedule query
      // When editing a virtual slot, we need to create an override slot
      
      if (!is_master && selectedDate && updates.day_of_week !== undefined) {
        console.log('Virtual slot detected - creating override slot for weekly schedule');
        
        // Calculate the slot_date from selectedDate and day_of_week
        const selectedDateObj = new Date(selectedDate);
        const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 0 });
        const targetDate = addDays(weekStart, parseInt(updates.day_of_week));
        const calculated_slot_date = format(targetDate, 'yyyy-MM-dd');
        
        console.log(`Creating override slot for date: ${calculated_slot_date}, day: ${updates.day_of_week}`);
        
        // Find the master slot to get parent_slot_id
        let parent_slot_id = updates.parent_slot_id;
        if (!parent_slot_id && updates.start_time && updates.day_of_week !== undefined) {
          const masterSlotQuery = await query(
            `SELECT id FROM schedule_slots 
             WHERE is_master = true 
             AND day_of_week = $1 
             AND start_time = $2 
             AND is_deleted = false`,
            [updates.day_of_week, updates.start_time]
          );
          
          if (masterSlotQuery.data && masterSlotQuery.data.length > 0) {
            parent_slot_id = masterSlotQuery.data[0].id;
            console.log(`Found parent master slot: ${parent_slot_id}`);
          }
        }
        
        // Create the override slot
        const createResult = await query(
          `INSERT INTO schedule_slots (
            slot_date, start_time, end_time, show_name, host_name,
            has_lineup, color, is_prerecorded, is_collection,
            is_master, day_of_week, parent_slot_id, is_recurring, is_deleted, created_at,
            rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, false, CURRENT_TIMESTAMP, $13, $14, $15, $16)
          RETURNING id, slot_date, start_time, end_time, show_name, host_name,
            has_lineup, color, is_prerecorded, is_collection,
            is_master, day_of_week, parent_slot_id, is_recurring, created_at, updated_at,
            rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated`,
          [
            calculated_slot_date,
            updates.start_time,
            updates.end_time,
            updates.show_name,
            updates.host_name,
            updates.has_lineup || false,
            updates.color || 'green',
            updates.is_prerecorded || false,
            updates.is_collection || false,
            updates.day_of_week,
            parent_slot_id,
            updates.is_recurring || false,
            updates.rds_pty || 1,
            updates.rds_ms || 0,
            updates.rds_radio_text || '',
            updates.rds_radio_text_translated || ''
          ]
        );
        
        if (createResult.error) {
          console.error('Error creating override slot:', createResult.error);
          return res.status(500).json({ 
            error: 'Failed to create override slot',
            details: createResult.error.message
          });
        }
        
        console.log('Successfully created override slot:', createResult.data[0]);
        return res.json(createResult.data[0]);
      }
      
      console.error('Slot not found:', { id });
      return res.status(404).json({ error: 'Slot not found' });
    }

    const slot = originalSlot.data[0];
    console.log('Found original slot:', {
      id: slot.id,
      show_name: slot.show_name,
      day_of_week: slot.day_of_week, 
      slot_date: slot.slot_date,
      is_master: slot.is_master,
      parent_slot_id: slot.parent_slot_id
    });

    let result;

    if (is_master && slot.is_master) {
      // MASTER SCHEDULE: Update master slot and all future instances
      console.log('Updating master slot and future instances');
      
      // Build the update fields for both master and instances
      const updateFields = [];
      const masterValues = [id];
      let paramIndex = 2;
      
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'slot_date' && key !== 'is_master' && key !== 'parent_slot_id') {
          updateFields.push(`${key} = $${paramIndex}`);
          masterValues.push(value);
          paramIndex++;
        }
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Update the master slot
      const masterUpdateQuery = `UPDATE schedule_slots 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_master = true
         RETURNING *`;
      
      console.log('Executing master slot update:', { query: masterUpdateQuery, values: masterValues });
      
      result = await query(masterUpdateQuery, masterValues);
      
      if (result.error) {
        console.error('Error updating master slot:', result.error);
        throw result.error;
      }
      
      console.log('Successfully updated master slot:', result.data[0]);

      // Update all future instances of this master slot
      const currentDate = new Date();
      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Build the instance update query with separate parameter indexing
      const instanceUpdateFields = [];
      const instanceValues = [id, currentDateStr];
      let instanceParamIndex = 3; // Start from 3 since $1 and $2 are used for WHERE clause
      
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'slot_date' && key !== 'is_master' && key !== 'parent_slot_id') {
          instanceUpdateFields.push(`${key} = $${instanceParamIndex}`);
          instanceValues.push(value);
          instanceParamIndex++;
        }
      }
      
      const instanceUpdateQuery = `UPDATE schedule_slots 
         SET ${instanceUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE parent_slot_id = $1 
         AND slot_date >= $2
         AND is_deleted = false
         RETURNING id`;
      
      console.log('Updating future instances:', { query: instanceUpdateQuery, values: instanceValues });
      
      const instancesResult = await query(instanceUpdateQuery, instanceValues);
      
      if (instancesResult.error) {
        console.error('Error updating instances:', instancesResult.error);
      } else {
        console.log(`Updated ${instancesResult.data.length} future instances`);
      }
      
    } else if (!is_master && !slot.is_master) {
      // WEEKLY SCHEDULE: Update only this specific weekly slot
      console.log('Updating weekly slot');
      
      const setClauses = [];
      const values = [id];
      let paramIndex = 2;
      
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'is_master' && key !== 'parent_slot_id') {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      const updateQuery = `UPDATE schedule_slots 
         SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_master = false
         RETURNING *`;
      
      console.log('Executing weekly slot update:', { query: updateQuery, values });
      
      result = await query(updateQuery, values);
      
      if (result.error) {
        console.error('Error updating weekly slot:', result.error);
        throw result.error;
      }
      
      console.log('Successfully updated weekly slot:', result.data[0]);
      
    } else {
      // Invalid operation: trying to update master slot from weekly view or vice versa
      console.error('Invalid update operation:', { 
        requestedMaster: is_master, 
        actualMaster: slot.is_master 
      });
      return res.status(400).json({ 
        error: 'Invalid operation: cannot update master slot from weekly view or vice versa' 
      });
    }

    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating schedule slot:', error);
    res.status(500).json({ error: 'Failed to update schedule slot' });
  }
});

// Delete schedule slot
router.delete('/slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isMasterSchedule } = req.body || {};
    
    console.log('Deleting slot:', { id, isMasterSchedule });
    
    if (isMasterSchedule === true || isMasterSchedule === 'true') {
      // For master slots, delete the master and all its instances
      const result = await query(
        `UPDATE schedule_slots 
         SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 OR parent_slot_id = $1
         RETURNING *`,
        [id]
      );
      
      if (result.error) {
        throw result.error;
      }
    } else {
      // For non-master slots, first check if the slot exists in the database
      const existingSlot = await query(
        `SELECT * FROM schedule_slots WHERE id = $1`,
        [id]
      );
      
      if (existingSlot.error) {
        throw existingSlot.error;
      }
      
      if (existingSlot.data && existingSlot.data.length > 0) {
        // Slot exists in database, delete it normally
        const result = await query(
          `UPDATE schedule_slots 
           SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id]
        );
        
        if (result.error) {
          throw result.error;
        }
      } else {
        // Slot doesn't exist in database - this is a virtual slot generated from master schedule
        // We need to create a deletion override to prevent the master slot from appearing
        console.log('Virtual slot deletion - creating deletion override');
        
        const { slot_date, day_of_week, start_time, end_time, show_name, host_name } = req.body;
        
        console.log('Virtual slot deletion data:', { slot_date, day_of_week, start_time, end_time, show_name, host_name });
        
        if (!slot_date || day_of_week === undefined || day_of_week === null) {
          console.log('Missing required data for virtual slot deletion');
          return res.status(400).json({ 
            error: 'Missing slot_date or day_of_week for virtual slot deletion' 
          });
        }
        
        // Find the master slot that this virtual slot was generated from
        const masterSlot = await query(
          `SELECT id FROM schedule_slots 
           WHERE is_master = true 
           AND is_deleted = false 
           AND day_of_week = $1
           AND start_time = $2
           AND end_time = $3
           LIMIT 1`,
          [day_of_week, start_time, end_time]
        );
        
        if (masterSlot.error) {
          throw masterSlot.error;
        }
        
        if (masterSlot.data && masterSlot.data.length > 0) {
          const masterSlotId = masterSlot.data[0].id;
          
          // Create a deletion override slot
          const deletionOverride = await query(
            `INSERT INTO schedule_slots (
              slot_date, start_time, end_time, show_name, host_name,
              has_lineup, color, is_prerecorded, is_collection,
              is_master, day_of_week, parent_slot_id, is_recurring, is_deleted
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING *`,
            [
              slot_date,
              start_time,
              end_time,
              show_name || 'DELETED',
              host_name || '',
              false, // has_lineup
              null,  // color
              false, // is_prerecorded
              false, // is_collection
              false, // is_master
              day_of_week,
              masterSlotId, // parent_slot_id
              false, // is_recurring
              true   // is_deleted - this is the key: mark as deleted to prevent master from showing
            ]
          );
          
          if (deletionOverride.error) {
            throw deletionOverride.error;
          }
          
          console.log('Created deletion override:', deletionOverride.data[0]);
        } else {
          console.log('Could not find master slot for virtual slot deletion');
          return res.status(404).json({ 
            error: 'Could not find master slot for virtual slot deletion' 
          });
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule slot:', error);
    res.status(500).json({ error: 'Failed to delete schedule slot' });
  }
});

// Generate schedule XML
router.post('/generate-xml', async (req, res) => {
  try {
    console.log('Generating schedule XML...');
    const { previewOffset } = req.body || {};
    
    // Query database to get offset setting or use provided preview offset
    let offset = 0;
    if (previewOffset !== undefined) {
      offset = parseInt(previewOffset);
    } else {
      const offsetResult = await query(
        "SELECT value FROM system_settings WHERE key = 'schedule_data_offset'"
      );
      
      if (offsetResult.data && offsetResult.data.length > 0) {
        offset = parseInt(offsetResult.data[0].value) || 0;
      }
    }
    
    console.log(`Using offset: ${offset} days`);
    
    // Get schedule data from database
    const scheduleSlotsResult = await query(
      `SELECT 
        id, day_of_week, start_time, end_time, show_name, host_name, has_lineup, 
        color, is_prerecorded, is_collection
       FROM 
        schedule_slots
       WHERE 
        is_master = true
        AND is_deleted = false
       ORDER BY 
        day_of_week, start_time`
    );
    
    if (scheduleSlotsResult.error) {
      throw scheduleSlotsResult.error;
    }
    
    // Generate XML
    const builder = new xml2js.Builder({
      rootName: 'schedule',
      headless: true,
      renderOpts: {
        pretty: true,
        indent: '  ',
        newline: '\n'
      }
    });
    
    // Apply offset to dates if needed
    const today = new Date();
    if (offset !== 0) {
      today.setDate(today.getDate() + offset);
    }
    
    // Create XML structure
    const xmlObj = {
      show: scheduleSlotsResult.data.map(slot => {
        // Calculate the date for this slot based on day of week
        const slotDate = getDateByDayOfWeek(today, slot.day_of_week);
        
        return {
          day: slot.day_of_week,
          date: format(slotDate, 'yyyy-MM-dd'),
          start_time: slot.start_time,
          end_time: slot.end_time,
          name: slot.show_name,
          host: slot.host_name || '',
          combined: slot.host_name ? `${slot.show_name} עם ${slot.host_name}` : slot.show_name,
          has_lineup: slot.has_lineup ? 'true' : 'false'
        };
      })
    };
    
    // Convert to XML
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.buildObject(xmlObj);
    
    // Store in database if this is not a preview
    if (previewOffset === undefined) {
      await query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [xml, 'schedule_xml']
      );
      
      // If schedule_xml doesn't exist, insert it
      const result = await query(
        'SELECT COUNT(*) FROM system_settings WHERE key = $1',
        ['schedule_xml']
      );
      
      if (result.data && parseInt(result.data[0].count) === 0) {
        await query(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          ['schedule_xml', xml]
        );
      }
    }
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating schedule XML:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedule XML',
      details: error.message 
    });
  }
});

// Generate schedule JSON
router.post('/generate-json', async (req, res) => {
  try {
    console.log('Generating schedule JSON...');
    const { previewOffset } = req.body || {};
    
    // Query database to get offset setting or use provided preview offset
    let offset = 0;
    if (previewOffset !== undefined) {
      offset = parseInt(previewOffset);
    } else {
      const offsetResult = await query(
        "SELECT value FROM system_settings WHERE key = 'schedule_data_offset'"
      );
      
      if (offsetResult.data && offsetResult.data.length > 0) {
        offset = parseInt(offsetResult.data[0].value) || 0;
      }
    }
    
    console.log(`Using offset: ${offset} days`);
    
    // Get schedule data from database
    const scheduleSlotsResult = await query(
      `SELECT 
        id, day_of_week, start_time, end_time, show_name, host_name, has_lineup, 
        color, is_prerecorded, is_collection
       FROM 
        schedule_slots
       WHERE 
        is_master = true
        AND is_deleted = false
       ORDER BY 
        day_of_week, start_time`
    );
    
    if (scheduleSlotsResult.error) {
      throw scheduleSlotsResult.error;
    }
    
    // Apply offset to dates if needed
    const today = new Date();
    if (offset !== 0) {
      today.setDate(today.getDate() + offset);
    }
    
    // Create JSON structure
    const schedule = scheduleSlotsResult.data.map(slot => {
      // Calculate the date for this slot based on day of week
      const slotDate = getDateByDayOfWeek(today, slot.day_of_week);
      
      return {
        id: slot.id,
        day: slot.day_of_week,
        date: format(slotDate, 'yyyy-MM-dd'),
        start_time: slot.start_time,
        end_time: slot.end_time,
        show_name: slot.show_name,
        host_name: slot.host_name || '',
        has_lineup: slot.has_lineup,
        color: slot.color || 'green',
        is_prerecorded: slot.is_prerecorded,
        is_collection: slot.is_collection
      };
    });
    
    const jsonData = JSON.stringify({ shows: schedule }, null, 2);
    
    // Store in database if this is not a preview
    if (previewOffset === undefined) {
      await query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [jsonData, 'schedule_json']
      );
      
      // If schedule_json doesn't exist, insert it
      const result = await query(
        'SELECT COUNT(*) FROM system_settings WHERE key = $1',
        ['schedule_json']
      );
      
      if (result.data && parseInt(result.data[0].count) === 0) {
        await query(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          ['schedule_json', jsonData]
        );
      }
    }
    
    res.json({ data: schedule });
  } catch (error) {
    console.error('Error generating schedule JSON:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedule JSON', 
      details: error.message 
    });
  }
});

// Serve XML file
router.get('/xml', async (req, res) => {
  try {
    // Get XML from the database
    const result = await query(
      "SELECT value FROM system_settings WHERE key = 'schedule_xml'"
    );
    
    if (!result.data || result.data.length === 0) {
      // Generate XML on the fly if it doesn't exist
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/schedule/generate-xml`, {
        method: 'POST'
      });
      const xml = await response.text();
      res.header('Content-Type', 'application/xml');
      res.send(xml);
      return;
    }
    
    res.header('Content-Type', 'application/xml');
    res.send(result.data[0].value);
  } catch (error) {
    console.error('Error serving schedule.xml:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><e>Failed to serve schedule XML</e>');
  }
});

// Serve JSON file
router.get('/json', async (req, res) => {
  try {
    // Get JSON from the database
    const result = await query(
      "SELECT value FROM system_settings WHERE key = 'schedule_json'"
    );
    
    if (!result.data || result.data.length === 0) {
      // Generate JSON on the fly if it doesn't exist
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/schedule/generate-json`, {
        method: 'POST'
      });
      const data = await response.json();
      res.json(data);
      return;
    }
    
    res.header('Content-Type', 'application/json');
    res.send(result.data[0].value);
  } catch (error) {
    console.error('Error serving schedule.json:', error);
    res.status(500).json({ error: 'Failed to serve schedule JSON' });
  }
});

// Update XML refresh interval
router.post('/xml-refresh', async (req, res) => {
  try {
    const { refreshInterval } = req.body || {};
    
    // Update the refresh interval if provided
    if (refreshInterval) {
      await query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [refreshInterval.toString(), 'schedule_xml_refresh_interval']
      );
    }
    
    // Get current refresh interval
    const intervalResult = await query(
      "SELECT value FROM system_settings WHERE key = 'schedule_xml_refresh_interval'"
    );
    
    let interval = 10; // Default to 10 minutes
    if (intervalResult.data && intervalResult.data.length > 0) {
      interval = parseInt(intervalResult.data[0].value) || 10;
    }
    
    console.log(`Schedule XML refresh set to ${interval} minutes`);
    
    res.json({ 
      success: true,
      message: `Schedule XML refresh set to ${interval} minutes`
    });
  } catch (error) {
    console.error('Error updating schedule XML refresh interval:', error);
    res.status(500).json({ error: 'Failed to update schedule XML refresh interval' });
  }
});

// Check for slot conflicts
router.post('/slots/check-conflicts', async (req, res) => {
  try {
    const { slotDate, dayOfWeek, startTime, endTime, excludeSlotId, isMasterSchedule } = req.body;
    
    console.log('Checking for slot conflicts:', {
      slotDate, dayOfWeek, startTime, endTime, excludeSlotId, isMasterSchedule
    });
    
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required parameters: dayOfWeek, startTime, endTime'
      });
    }
    
    // Convert isMasterSchedule to boolean for clarity
    const is_master = isMasterSchedule === true || isMasterSchedule === 'true';
    
    // Build the query to check for conflicts
    let queryStr = `
      SELECT * FROM schedule_slots
      WHERE is_deleted = false
      AND day_of_week = $1
      AND (
        (start_time <= $2 AND end_time > $2) OR
        (start_time < $3 AND end_time >= $3) OR
        (start_time >= $2 AND end_time <= $3)
      )
    `;
    
    const params = [dayOfWeek, startTime, endTime];
    
    // For master schedule, check against other master slots
    if (is_master) {
      queryStr += ` AND is_master = true`;
    } else {
      // For weekly schedule, check against other weekly slots for the specific date
      if (!slotDate) {
        return res.status(400).json({
          error: 'slotDate is required for weekly schedule conflict checking'
        });
      }
      queryStr += ` AND is_master = false AND slot_date = $4::date`;
      params.push(slotDate);
    }
    
    // If we're excluding a specific slot, add that to the query
    if (excludeSlotId) {
      queryStr += ` AND id != $${params.length + 1}`;
      params.push(excludeSlotId);
    }
    
    console.log('Executing conflict check query:', { queryStr, params });
    
    const result = await query(queryStr, params);
    
    if (result.error) {
      console.error('Error checking for conflicts:', result.error);
      throw result.error;
    }
    
    const hasConflict = result.data && result.data.length > 0;
    
    console.log('Conflict check result:', {
      hasConflict,
      conflictingSlots: result.data
    });
    
    res.json({
      hasConflict,
      conflictingSlots: hasConflict ? result.data : [],
      conflictingSlot: hasConflict && Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null
    });
  } catch (error) {
    console.error('Error checking for slot conflicts:', error);
    res.status(500).json({
      error: 'Failed to check for slot conflicts',
      details: error.message
    });
  }
});

// Update slot has_lineup status
router.put('/slots/:id/has-lineup', async (req, res) => {
  try {
    const { id } = req.params;
    const { has_lineup } = req.body;
    
    console.log('Updating slot has_lineup status:', { id, has_lineup });
    
    if (typeof has_lineup !== 'boolean') {
      return res.status(400).json({ error: 'has_lineup must be a boolean' });
    }
    
    const result = await query(
      `UPDATE schedule_slots 
       SET has_lineup = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, has_lineup`,
      [has_lineup, id]
    );
    
    if (result.error) {
      console.error('Error updating slot has_lineup status:', result.error);
      throw result.error;
    }
    
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    console.log('Successfully updated slot has_lineup status:', result.data[0]);
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating slot has_lineup status:', error);
    res.status(500).json({ error: 'Failed to update slot has_lineup status' });
  }
});

// Get autocomplete suggestions for show_name and host_name
router.get('/autocomplete', async (req, res) => {
  try {
    // Query distinct show_name values
    const showNamesResult = await query(`
      SELECT DISTINCT show_name
      FROM schedule_slots
      WHERE is_deleted = false
      AND show_name IS NOT NULL
      AND show_name != ''
      ORDER BY show_name ASC
    `);

    // Query distinct host_name values
    const hostNamesResult = await query(`
      SELECT DISTINCT host_name
      FROM schedule_slots
      WHERE is_deleted = false
      AND host_name IS NOT NULL
      AND host_name != ''
      ORDER BY host_name ASC
    `);

    if (showNamesResult.error) {
      throw showNamesResult.error;
    }
    if (hostNamesResult.error) {
      throw hostNamesResult.error;
    }

    const showNames = (showNamesResult.data || []).map(row => row.show_name).filter(Boolean);
    const hostNames = (hostNamesResult.data || []).map(row => row.host_name).filter(Boolean);

    res.json({
      showNames,
      hostNames
    });
  } catch (error) {
    console.error('Error fetching autocomplete suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch autocomplete suggestions' });
  }
});

export default router;
