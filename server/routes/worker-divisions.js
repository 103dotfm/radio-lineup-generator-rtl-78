import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';
import { isValidUUID } from '../utils/validation.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get worker divisions with search support
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
        
        // Validate UUIDs
        if (whereConditions.division_id && !isValidUUID(whereConditions.division_id)) {
          console.error('Invalid division_id UUID:', whereConditions.division_id);
          return res.status(400).json({ error: 'Invalid division_id format' });
        }
        if (whereConditions.worker_id && !isValidUUID(whereConditions.worker_id)) {
          console.error('Invalid worker_id UUID:', whereConditions.worker_id);
          return res.status(400).json({ error: 'Invalid worker_id format' });
        }
        
        console.log('Parsed where conditions:', whereConditions);
      } catch (error) {
        console.error('Error parsing where conditions:', {
          error,
          message: error.message,
          stack: error.stack,
          originalWhere: where
        });
        return res.status(400).json({ error: 'Invalid where conditions', details: error.message });
      }
    }
    
    // Parse order
    if (order) {
      try {
        orderBy = typeof order === 'string' ? JSON.parse(order) : order;
        console.log('Parsed order:', orderBy);
      } catch (error) {
        console.error('Error parsing order:', {
          error,
          message: error.message,
          stack: error.stack,
          originalOrder: order
        });
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
        console.error('Error parsing limit:', {
          error,
          message: error.message,
          stack: error.stack,
          originalLimit: limit
        });
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

    const result = await executeSelect('worker_divisions', {
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

    // If no data was found and we have both division_id and worker_id
    if (!result.data?.length && whereConditions.division_id && whereConditions.worker_id) {
      // Create a new worker division
      const newWorkerDivision = {
        id: uuidv4(), // Generate UUID for new record
        division_id: whereConditions.division_id,
        worker_id: whereConditions.worker_id,
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log('Creating new worker division:', newWorkerDivision);
      
      try {
        const insertResult = await executeInsert('worker_divisions', newWorkerDivision);
        
        if (insertResult.error) {
          console.error('Error creating new worker division:', {
            error: insertResult.error,
            message: insertResult.error.message,
            stack: insertResult.error.stack,
            query: insertResult.error.query,
            newWorkerDivision
          });
          return res.status(500).json({ 
            error: 'Failed to create worker division',
            details: process.env.NODE_ENV === 'development' ? {
              message: insertResult.error.message,
              query: insertResult.error.query,
              workerDivision: newWorkerDivision
            } : undefined
          });
        }

        // Return the newly created division
        if (single === 'true') {
          return res.json(insertResult.data[0]);
        }
        return res.json(insertResult.data);
      } catch (insertError) {
        console.error('Error in insert operation:', {
          error: insertError,
          message: insertError.message,
          stack: insertError.stack,
          newWorkerDivision
        });
        return res.status(500).json({
          error: 'Failed to create worker division',
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
    console.error('Error getting worker divisions:', {
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

// Create worker division
router.post('/', async (req, res) => {
  try {
    const workerDivision = {
      id: uuidv4(), // Generate UUID for new record
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('worker_divisions', workerDivision);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating worker division:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update worker division
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('worker_divisions', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating worker division:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete worker division by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const result = await executeDelete('worker_divisions', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker division:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete worker division by worker_id and division_id
router.delete('/', async (req, res) => {
  try {
    const { worker_id, division_id } = req.query;
    
    if (!worker_id || !division_id) {
      return res.status(400).json({ error: 'Both worker_id and division_id are required' });
    }
    
    if (!isValidUUID(worker_id) || !isValidUUID(division_id)) {
      return res.status(400).json({ error: 'Invalid UUID format' });
    }
    
    const result = await executeDelete('worker_divisions', { worker_id, division_id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker division:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 