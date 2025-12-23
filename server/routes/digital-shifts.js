import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';

const router = express.Router();

// Get digital shifts with search support
router.get('/', async (req, res) => {
  try {
    const { where, order, limit, select } = req.query;
    let whereConditions = {};
    let orderBy = {};
    let limitNum = undefined;
    let selectFields = '*';
    
    // Parse where conditions
    if (where) {
      try {
        whereConditions = typeof where === 'string' ? JSON.parse(where) : where;
      } catch (error) {
        console.error('Error parsing where conditions:', error);
        return res.status(400).json({ error: 'Invalid where conditions' });
      }
    }
    
    // Parse order
    if (order) {
      try {
        orderBy = typeof order === 'string' ? JSON.parse(order) : order;
      } catch (error) {
        console.error('Error parsing order:', error);
        return res.status(400).json({ error: 'Invalid order parameter' });
      }
    }
    
    // Parse limit
    if (limit) {
      try {
        limitNum = parseInt(limit);
        if (isNaN(limitNum)) throw new Error('Invalid limit');
      } catch (error) {
        console.error('Error parsing limit:', error);
        return res.status(400).json({ error: 'Invalid limit parameter' });
      }
    }

    // Parse select fields
    if (select) {
      selectFields = select;
    }

    const result = await executeSelect('digital_shifts', {
      select: selectFields,
      where: whereConditions,
      orderBy,
      limit: limitNum
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting digital shifts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create digital shift
router.post('/', async (req, res) => {
  try {
    const shift = {
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('digital_shifts', shift);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating digital shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update digital shift
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('digital_shifts', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating digital shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete digital shift
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeDelete('digital_shifts', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting digital shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 