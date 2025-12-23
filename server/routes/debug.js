import express from 'express';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// Debug endpoint to check schedule slots table
router.get('/schedule-slots', async (req, res) => {
  try {
    console.log('Retrieving schedule slots debug info');
    
    // Get total count of slots
    const totalCountResult = await query('SELECT COUNT(*) FROM schedule_slots');
    const totalCount = parseInt(totalCountResult.data[0].count);
    
    // Get count of master slots
    const masterCountResult = await query('SELECT COUNT(*) FROM schedule_slots WHERE is_master = true');
    const masterCount = parseInt(masterCountResult.data[0].count);
    
    // Get count of active master slots (not deleted)
    const activeMasterCountResult = await query(
      'SELECT COUNT(*) FROM schedule_slots WHERE is_master = true AND is_deleted = false'
    );
    const activeMasterCount = parseInt(activeMasterCountResult.data[0].count);
    
    // Get count of weekly slots (non-master)
    const weeklyCountResult = await query('SELECT COUNT(*) FROM schedule_slots WHERE is_master = false');
    const weeklyCount = parseInt(weeklyCountResult.data[0].count);
    
    // Get count of deleted slots
    const deletedCountResult = await query('SELECT COUNT(*) FROM schedule_slots WHERE is_deleted = true');
    const deletedCount = parseInt(deletedCountResult.data[0].count);
    
    // Get a sample of master slots
    const sampleMasterSlotsResult = await query(
      `SELECT id, show_name, day_of_week, start_time, end_time, is_master, is_deleted, created_at 
       FROM schedule_slots 
       WHERE is_master = true 
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    const sampleMasterSlots = sampleMasterSlotsResult.data;
    
    // Return all the debug info
    res.json({
      totalCount,
      masterCount,
      activeMasterCount,
      weeklyCount,
      deletedCount,
      sampleMasterSlots
    });
  } catch (error) {
    console.error('Error retrieving debug info:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve debug info',
      details: error.message 
    });
  }
});

// Debug endpoint to fix deleted slots that might have incorrect flags
router.post('/fix-slots', async (req, res) => {
  try {
    console.log('Running schedule slots fixes');
    
    // Reset is_deleted flags for master slots that might have been incorrectly set
    const fixMasterSlotsResult = await query(
      `UPDATE schedule_slots 
       SET is_deleted = false 
       WHERE is_master = true 
       AND is_deleted = true 
       RETURNING id, show_name`
    );
    
    // Update is_master flag for any slots that might have incorrect flags
    const fixIsMasterFlagsResult = await query(
      `UPDATE schedule_slots 
       SET is_master = true 
       WHERE parent_slot_id IS NULL 
       AND is_master = false 
       RETURNING id, show_name`
    );
    
    // Count slots after fixes
    const postFixMasterCountResult = await query(
      'SELECT COUNT(*) FROM schedule_slots WHERE is_master = true AND is_deleted = false'
    );
    const postFixMasterCount = parseInt(postFixMasterCountResult.data[0].count);
    
    res.json({
      fixedDeletedMasterSlots: fixMasterSlotsResult.data,
      fixedIsMasterFlags: fixIsMasterFlagsResult.data,
      postFixMasterCount
    });
  } catch (error) {
    console.error('Error fixing slots:', error);
    res.status(500).json({ 
      error: 'Failed to fix slots',
      details: error.message 
    });
  }
});

export default router; 