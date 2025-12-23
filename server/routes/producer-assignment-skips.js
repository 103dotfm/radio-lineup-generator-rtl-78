import express from 'express';
import { executeSelect, executeInsert, executeUpdate } from '../utils/db.js';

const router = express.Router();

// Helper function to parse JSON safely
const safeJSONParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

// Get producer assignment skips
router.get('/', async (req, res) => {
  try {
    const { where } = req.query;
    let whereConditions = {};
    
    // Parse where conditions
    if (where) {
      try {
        if (typeof where === 'string') {
          // Try to parse the entire where clause
          whereConditions = safeJSONParse(where);
        } else {
          // Handle object format
          whereConditions = where;
        }
      } catch (error) {
        console.error('Error parsing where conditions:', error);
        return res.status(400).json({ error: 'Invalid where conditions' });
      }
    }

    // Convert conditions to proper format
    const formattedWhere = {};
    for (const [key, value] of Object.entries(whereConditions)) {
      const parsedValue = typeof value === 'string' ? safeJSONParse(value) : value;
      
      if (typeof parsedValue === 'object' && parsedValue !== null) {
        // Handle operators like eq, lte, gte
        if (parsedValue.eq !== undefined) formattedWhere[key] = parsedValue.eq;
        if (parsedValue.lte !== undefined) formattedWhere[`${key} <=`] = parsedValue.lte;
        if (parsedValue.gte !== undefined) formattedWhere[`${key} >=`] = parsedValue.gte;
      } else {
        formattedWhere[key] = parsedValue;
      }
    }

    console.log('Formatted where conditions:', formattedWhere);

    const result = await executeSelect('producer_assignment_skips', {
      select: '*',
      where: formattedWhere
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting producer assignment skips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create producer assignment skip
router.post('/', async (req, res) => {
  try {
    const skip = {
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('producer_assignment_skips', skip);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating producer assignment skip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update producer assignment skip
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('producer_assignment_skips', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating producer assignment skip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 