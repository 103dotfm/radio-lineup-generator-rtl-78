import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get producer work arrangements with search support
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

    const result = await executeSelect('producer_work_arrangements', {
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

    // If no data was found and we're looking for a specific week_start
    if (!result.data?.length && whereConditions.week_start) {
      // Create a new work arrangement for the specified week
      const newArrangement = {
        id: uuidv4(), // Generate UUID for new record
        week_start: whereConditions.week_start,
        notes: '',
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log('Creating new work arrangement:', newArrangement);
      
      try {
        const insertResult = await executeInsert('producer_work_arrangements', newArrangement);
        
        if (insertResult.error) {
          console.error('Error creating new work arrangement:', {
            error: insertResult.error,
            message: insertResult.error.message,
            stack: insertResult.error.stack,
            query: insertResult.error.query,
            newArrangement
          });
          return res.status(500).json({ 
            error: 'Failed to create work arrangement',
            details: process.env.NODE_ENV === 'development' ? {
              message: insertResult.error.message,
              query: insertResult.error.query,
              arrangement: newArrangement
            } : undefined
          });
        }

        // Return the newly created arrangement
        if (single === 'true') {
          return res.json(insertResult.data[0]);
        }
        return res.json(insertResult.data);
      } catch (insertError) {
        console.error('Error in insert operation:', {
          error: insertError,
          message: insertError.message,
          stack: insertError.stack,
          newArrangement
        });
        return res.status(500).json({
          error: 'Failed to create work arrangement',
          details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
        });
      }
    }
    
    // If single is true, return the first item or null
    if (single === 'true') {
      return res.json(result.data?.[0] || null);
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting producer work arrangements:', {
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

// Create producer work arrangement
router.post('/', async (req, res) => {
  try {
    const arrangement = {
      id: uuidv4(), // Generate UUID for new record
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('producer_work_arrangements', arrangement);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating producer work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update producer work arrangement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('producer_work_arrangements', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating producer work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete producer work arrangement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeDelete('producer_work_arrangements', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting producer work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 