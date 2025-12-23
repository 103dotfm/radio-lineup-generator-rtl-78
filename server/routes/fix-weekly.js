import express from 'express';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// Fix weekly schedule with Israeli week format
router.post('/fix-israeli-week', async (req, res) => {
  try {
    console.log('Starting Israeli week format fix...');
    
    // 1. Show current Israeli week info
    console.log('\n=== CURRENT ISRAELI WEEK INFO ===');
    const weekInfo = await query(`
      SELECT 
        CURRENT_DATE as today,
        (CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date as israeli_week_start,
        ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + interval '6 days')::date as israeli_week_end
    `);
    
    if (weekInfo.error) {
      console.error('Error getting week info:', weekInfo.error);
      return res.status(500).json({ error: weekInfo.error.message });
    }
    
    const weekData = weekInfo.data[0];
    console.log(weekData);
    
    // 2. Delete existing slots for the current Israeli week
    console.log('\n=== DELETING EXISTING SLOTS ===');
    const deleteResult = await query(`
      DELETE FROM schedule_slots 
      WHERE slot_date BETWEEN 
        (CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date 
        AND 
        ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + interval '6 days')::date
      AND is_master = false
    `);
    
    if (deleteResult.error) {
      console.error('Error deleting slots:', deleteResult.error);
      return res.status(500).json({ error: deleteResult.error.message });
    }
    
    const deletedCount = deleteResult.data?.rowCount || 0;
    console.log(`Deleted ${deletedCount} existing slots`);
    
    // 3. Insert new slots for the current Israeli week
    console.log('\n=== INSERTING NEW SLOTS ===');
    const insertResult = await query(`
      INSERT INTO schedule_slots (
        slot_date, start_time, end_time, show_name, host_name,
        has_lineup, color, is_prerecorded, is_collection,
        is_master, day_of_week, parent_slot_id, is_recurring, is_deleted,
        created_at, updated_at
      )
      SELECT 
        ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + (ms.day_of_week * interval '1 day'))::date as slot_date,
        ms.start_time,
        ms.end_time,
        ms.show_name,
        ms.host_name,
        ms.has_lineup,
        ms.color,
        ms.is_prerecorded,
        ms.is_collection,
        false as is_master,
        ms.day_of_week,
        ms.id as parent_slot_id,
        ms.is_recurring,
        false as is_deleted,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM schedule_slots ms
      WHERE ms.is_master = true 
        AND ms.is_deleted = false
        AND ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + (ms.day_of_week * interval '1 day'))::date 
            BETWEEN 
              (CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date 
              AND 
              ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + interval '6 days')::date
    `);
    
    if (insertResult.error) {
      console.error('Error inserting slots:', insertResult.error);
      return res.status(500).json({ error: insertResult.error.message });
    }
    
    const insertedCount = insertResult.data?.rowCount || 0;
    console.log(`Inserted ${insertedCount} new slots`);
    
    // 4. Verify the results
    console.log('\n=== VERIFYING RESULTS ===');
    const verifyResult = await query(`
      SELECT 
        slot_date, 
        CASE 
          WHEN extract(dow from slot_date) = 0 THEN 'Sunday'
          WHEN extract(dow from slot_date) = 1 THEN 'Monday'
          WHEN extract(dow from slot_date) = 2 THEN 'Tuesday'
          WHEN extract(dow from slot_date) = 3 THEN 'Wednesday'
          WHEN extract(dow from slot_date) = 4 THEN 'Thursday'
          WHEN extract(dow from slot_date) = 5 THEN 'Friday'
          WHEN extract(dow from slot_date) = 6 THEN 'Saturday'
        END as day_name,
        day_of_week, start_time, end_time, show_name, host_name
      FROM schedule_slots 
      WHERE slot_date BETWEEN 
        (CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date 
        AND 
        ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + interval '6 days')::date
      AND is_master = false AND is_deleted = false
      ORDER BY slot_date, start_time
    `);
    
    if (verifyResult.error) {
      console.error('Error verifying results:', verifyResult.error);
      return res.status(500).json({ error: verifyResult.error.message });
    }
    
    const slots = verifyResult.data;
    console.log('\nSlots for current Israeli week:');
    slots.forEach(slot => {
      console.log(`${slot.day_name} (${slot.slot_date}): ${slot.start_time}-${slot.end_time} - ${slot.show_name}`);
    });
    
    // 5. Count slots by day
    console.log('\n=== SLOT COUNT BY DAY ===');
    const countResult = await query(`
      SELECT 
        slot_date,
        CASE 
          WHEN extract(dow from slot_date) = 0 THEN 'Sunday'
          WHEN extract(dow from slot_date) = 1 THEN 'Monday'
          WHEN extract(dow from slot_date) = 2 THEN 'Tuesday'
          WHEN extract(dow from slot_date) = 3 THEN 'Wednesday'
          WHEN extract(dow from slot_date) = 4 THEN 'Thursday'
          WHEN extract(dow from slot_date) = 5 THEN 'Friday'
          WHEN extract(dow from slot_date) = 6 THEN 'Saturday'
        END as day_name,
        COUNT(*) as slots_count
      FROM schedule_slots 
      WHERE slot_date BETWEEN 
        (CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date 
        AND 
        ((CURRENT_DATE - (extract(dow from CURRENT_DATE) * interval '1 day'))::date + interval '6 days')::date
      AND is_master = false AND is_deleted = false
      GROUP BY slot_date
      ORDER BY slot_date
    `);
    
    if (countResult.error) {
      console.error('Error counting slots:', countResult.error);
      return res.status(500).json({ error: countResult.error.message });
    }
    
    const dayCounts = countResult.data;
    console.log('\nSlot count by day:');
    dayCounts.forEach(day => {
      console.log(`${day.day_name} (${day.slot_date}): ${day.slots_count} slots`);
    });
    
    console.log('\nIsraeli week format fix completed successfully!');
    
    res.json({
      success: true,
      message: 'Israeli week format fix completed successfully',
      data: {
        weekInfo: weekData,
        deletedSlots: deletedCount,
        insertedSlots: insertedCount,
        slots: slots,
        dayCounts: dayCounts
      }
    });
    
  } catch (error) {
    console.error('Error in fixIsraeliWeek:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 