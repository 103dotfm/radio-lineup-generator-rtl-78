import express from 'express';
import { executeSelect, executeInsert, executeDelete } from '../utils/db.js';

const router = express.Router();

// Get interviewees with search support
router.get('/', async (req, res) => {
  try {
    const { where, order, limit } = req.query;
    let whereConditions = {};
    let orderBy = {};
    let limitNum = undefined;
    
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

    console.log('Executing query with:', {
      whereConditions,
      orderBy,
      limitNum
    });

    const result = await executeSelect('interviewees', {
      select: '*',
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
    console.error('Error getting interviewees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create interviewee
router.post('/', async (req, res) => {
  try {
    const interviewee = {
      ...req.body,
      created_at: new Date()
    };
    
    console.log('Creating interviewee:', interviewee);
    
    const result = await executeInsert('interviewees', interviewee);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating interviewee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete interviewee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting interviewee:', id);
    
    const result = await executeDelete('interviewees', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting interviewee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 