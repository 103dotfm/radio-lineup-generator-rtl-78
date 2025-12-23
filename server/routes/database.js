import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// Generic query endpoint
router.get('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { select, where, order, limit } = req.query;
    
    const result = await executeSelect(table, {
      select,
      where: where ? JSON.parse(where) : undefined,
      order: order ? JSON.parse(order) : undefined,
      limit: limit ? parseInt(limit) : undefined
    });
    
    if (result.error) {
      throw result.error;
    }
    
    res.json({ data: result.data });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert endpoint
router.post('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const result = await executeInsert(table, req.body);
    
    if (result.error) {
      throw result.error;
    }
    
    res.json({ data: result.data });
  } catch (error) {
    console.error('Database insert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update endpoint
router.put('/:table/:column/:value', async (req, res) => {
  try {
    const { table, column, value } = req.params;
    const result = await executeUpdate(table, req.body, {
      [column]: value
    });
    
    if (result.error) {
      throw result.error;
    }
    
    res.json({ data: result.data });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete endpoint
router.delete('/:table/:column/:value', async (req, res) => {
  try {
    const { table, column, value } = req.params;
    const result = await executeDelete(table, {
      [column]: value
    });
    
    if (result.error) {
      throw result.error;
    }
    
    res.json({ data: result.data });
  } catch (error) {
    console.error('Database delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run migration to add is_modified column if it doesn't exist
router.post('/migrations/add-is-modified', async (req, res) => {
  try {
    // Check if the column exists
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      AND column_name = 'is_modified'
    `);
    
    if (checkResult.error) {
      throw checkResult.error;
    }
    
    // If column doesn't exist, add it
    if (!checkResult.data || checkResult.data.length === 0) {
      console.log('is_modified column does not exist, adding it...');
      
      // Add the column
      const alterResult = await query(`
        ALTER TABLE schedule_slots 
        ADD COLUMN is_modified BOOLEAN DEFAULT false
      `);
      
      if (alterResult.error) {
        throw alterResult.error;
      }
      
      console.log('is_modified column added successfully');
      
      // Update existing weekly slots to set is_modified=false
      const updateResult = await query(`
        UPDATE schedule_slots 
        SET is_modified = false 
        WHERE is_master = false
      `);
      
      if (updateResult.error) {
        throw updateResult.error;
      }
      
      console.log('Existing weekly slots updated with is_modified=false');
      
      res.json({ 
        success: true, 
        message: 'Migration completed successfully' 
      });
    } else {
      console.log('is_modified column already exists');
      res.json({ 
        success: true, 
        message: 'Column already exists, no migration needed' 
      });
    }
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router; 