import express from 'express';
import { executeSelect, executeInsert } from '../utils/db.js';

const router = express.Router();

// Get show items with search support
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
        
        // Handle ilike operator for name
        if (whereConditions.name?.ilike) {
          whereConditions['name ILIKE'] = whereConditions.name.ilike;
          delete whereConditions.name;
        }
        
        // Handle eq operator for is_break and is_note
        if (whereConditions.is_break?.eq !== undefined) {
          whereConditions.is_break = whereConditions.is_break.eq;
        }
        if (whereConditions.is_note?.eq !== undefined) {
          whereConditions.is_note = whereConditions.is_note.eq;
        }
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

    const result = await executeSelect('show_items', {
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
    console.error('Error getting show items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create show item
router.post('/', async (req, res) => {
  try {
    // Extract interviewees from the request body and remove them from showItem
    const { interviewees, ...showItemData } = req.body;
    
    const showItem = {
      ...showItemData,
      created_at: new Date()
    };
    
    console.log('Creating show item:', showItem);
    
    const result = await executeInsert('show_items', showItem);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // If there are interviewees, create them in the interviewees table
    if (interviewees && interviewees.length > 0) {
      console.log('Creating interviewees for item:', result.data[0].id);
      
      for (const interviewee of interviewees) {
        const intervieweeData = {
          item_id: result.data[0].id,
          name: interviewee.name,
          title: interviewee.title || null,
          phone: interviewee.phone || null,
          duration: interviewee.duration || null,
          created_at: new Date()
        };
        
        const intervieweeResult = await executeInsert('interviewees', intervieweeData);
        if (intervieweeResult.error) {
          console.error('Error creating interviewee:', intervieweeResult.error);
          // Don't fail the entire request, just log the error
        }
      }
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating show item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 