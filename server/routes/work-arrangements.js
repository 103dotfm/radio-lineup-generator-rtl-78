import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';

const router = express.Router();

// Get work arrangements with search support
router.get('/', async (req, res) => {
  try {
    const { where, order, limit, select, single } = req.query;
    let whereConditions = {};
    let orderBy = {};
    let limitNum = undefined;
    let selectFields = '*';
    
    // Parse where conditions
    if (where) {
      try {
        whereConditions = typeof where === 'string' ? JSON.parse(where) : where;
        
        // Handle date conversion for week_start
        if (whereConditions.week_start) {
          try {
            // Ensure the date is in YYYY-MM-DD format
            const date = new Date(whereConditions.week_start);
            whereConditions.week_start = date.toISOString().split('T')[0];
            console.log('Converted week_start date:', whereConditions.week_start);
          } catch (dateError) {
            console.error('Error parsing week_start date:', {
              error: dateError,
              originalValue: whereConditions.week_start
            });
            return res.status(400).json({ 
              error: 'Invalid week_start date format',
              details: process.env.NODE_ENV === 'development' ? dateError.message : undefined
            });
          }
        }
        
        console.log('Parsed where conditions:', whereConditions);
      } catch (error) {
        console.error('Error parsing where conditions:', error);
        return res.status(400).json({ error: 'Invalid where conditions', details: error.message });
      }
    }
    
    // Parse order
    if (order) {
      try {
        orderBy = typeof order === 'string' ? JSON.parse(order) : order;
        console.log('Parsed order:', orderBy);
      } catch (error) {
        console.error('Error parsing order:', error);
        return res.status(400).json({ error: 'Invalid order parameter', details: error.message });
      }
    }
    
    // Parse limit
    if (limit) {
      try {
        limitNum = parseInt(limit);
        if (isNaN(limitNum)) throw new Error('Invalid limit');
        console.log('Parsed limit:', limitNum);
      } catch (error) {
        console.error('Error parsing limit:', error);
        return res.status(400).json({ error: 'Invalid limit parameter', details: error.message });
      }
    }

    // Parse select fields
    if (select) {
      selectFields = select;
      console.log('Using select fields:', selectFields);
    }

    console.log('Executing query with:', {
      whereConditions,
      orderBy,
      limitNum,
      selectFields,
      single
    });

    const result = await executeSelect('work_arrangements', {
      select: selectFields,
      where: whereConditions,
      orderBy,
      limit: limitNum
    });
    
    if (result.error) {
      console.error('Database error details:', {
        error: result.error,
        message: result.error.message,
        stack: result.error.stack,
        query: result.error.query,
        whereConditions,
        orderBy,
        limitNum,
        selectFields
      });
      return res.status(500).json({ 
        error: 'Database error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          message: result.error.message,
          query: result.error.query,
          params: {
            whereConditions,
            orderBy,
            limitNum,
            selectFields
          }
        } : undefined
      });
    }

    // If single is true, return the first item or null
    if (single === 'true' || single === true) {
      const data = result.data || [];
      res.json(data.length > 0 ? data[0] : null);
    } else {
      res.json(result.data || []);
    }
  } catch (error) {
    console.error('Error getting work arrangements:', {
      error,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create work arrangement
router.post('/', async (req, res) => {
  try {
    const { type, week_start, filename, url } = req.body;
    
    if (!type || !week_start || !filename || !url) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, week_start, filename, url' 
      });
    }

    const newArrangement = {
      type,
      week_start,
      filename,
      url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating work arrangement:', newArrangement);

    const result = await executeInsert('work_arrangements', newArrangement);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error creating work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update work arrangement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    console.log('Updating work arrangement:', { id, updates });

    const result = await executeUpdate('work_arrangements', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error updating work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete work arrangement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting work arrangement:', id);

    const result = await executeDelete('work_arrangements', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    res.json({ message: 'Work arrangement deleted successfully' });
  } catch (error) {
    console.error('Error deleting work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 