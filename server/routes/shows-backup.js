import express from 'express';
import { executeSelect } from '../utils/db.js';

const router = express.Router();

// Get shows from backup table with search support
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

    console.log('Executing shows_backup query with:', {
      whereConditions,
      orderBy,
      limitNum
    });

    const result = await executeSelect('shows_backup', {
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
    console.error('Error getting shows from backup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search shows in backup table
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('Searching shows_backup with query:', query);

    const result = await executeSelect('shows_backup', {
      select: '*',
      where: {
        'name ILIKE': `%${query}%`
      },
      orderBy: { created_at: 'DESC' },
      limit: 50
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error searching shows in backup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get show items for a specific show from backup
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeSelect('show_items', {
      select: '*',
      where: { show_id: id },
      orderBy: { position: 'ASC' }
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting show items from backup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 