import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';
import { query } from '../../src/lib/db.js';

const router = express.Router();

// Get shows with search support
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
        
        // Handle 'in' operator for id
        if (whereConditions.id?.in) {
          whereConditions['id = ANY'] = whereConditions.id.in;
          delete whereConditions.id;
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

    const result = await executeSelect('shows', {
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
    console.error('Error getting shows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create show
router.post('/', async (req, res) => {
  try {
    const show = {
      ...req.body,
      created_at: new Date()
    };
    
    const result = await executeInsert('shows', show);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating show:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update show
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body
    };
    
    const result = await executeUpdate('shows', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating show:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete show items
router.delete('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting show items for show_id:', id);
    
    // Use direct query instead of executeDelete to avoid connection issues
    const result = await query(
      'DELETE FROM show_items WHERE show_id = $1 RETURNING *',
      [id]
    );
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    console.log('Successfully deleted show items:', result.data?.length || 0, 'items');
    res.json({ success: true, deletedCount: result.data?.length || 0 });
  } catch (error) {
    console.error('Error deleting show items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete show
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting show with id:', id);
    
    // Use direct query instead of executeDelete to avoid connection issues
    const result = await query(
      'DELETE FROM shows WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    console.log('Successfully deleted show:', result.data?.[0]?.name || 'Unknown');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get the latest show
router.get('/latest', async (req, res) => {
  try {
    const result = await executeSelect('shows', {
      select: '*',
      orderBy: { created_at: 'DESC' },
      limit: 1
    });
    if (result.data && result.data.length > 0) {
      res.json(result.data[0]);
    } else {
      res.json({ message: 'No shows found' });
    }
  } catch (error) {
    console.error('Error fetching latest show:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router; 