import express from 'express';
import { executeSelect, executeInsert, executeUpdate, executeDelete } from '../utils/db.js';

const router = express.Router();

// Get digital work arrangements with search support
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

    console.log('Executing query with:', {
      whereConditions,
      orderBy,
      limitNum,
      selectFields,
      single
    });

    const result = await executeSelect('digital_work_arrangements', {
      select: selectFields,
      where: whereConditions,
      orderBy,
      limit: limitNum
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // If single is true, return the first item or null
    if (single === 'true') {
      return res.json(result.data?.[0] || null);
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting digital work arrangements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create digital work arrangement
router.post('/', async (req, res) => {
  try {
    const arrangement = {
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('digital_work_arrangements', arrangement);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating digital work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update digital work arrangement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('digital_work_arrangements', updateData, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Digital work arrangement not found' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating digital work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete digital work arrangement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeDelete('digital_work_arrangements', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting digital work arrangement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shifts for arrangement
router.get('/:id/shifts', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeSelect('digital_shifts', {
      select: '*',
      where: { arrangement_id: id },
      orderBy: { position: 'asc' }
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting shifts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create shift
router.post('/:id/shifts', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeInsert('digital_shifts', {
      ...req.body,
      arrangement_id: id,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shift
router.put('/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeUpdate('digital_shifts', {
      ...req.body,
      updated_at: new Date()
    }, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shift
router.delete('/shifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeDelete('digital_shifts', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get custom rows for arrangement
router.get('/:id/custom-rows', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeSelect('digital_shift_custom_rows', {
      select: '*',
      where: { arrangement_id: id },
      orderBy: { position: 'asc' }
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting custom rows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create custom row
router.post('/:id/custom-rows', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeInsert('digital_shift_custom_rows', {
      ...req.body,
      arrangement_id: id,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating custom row:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update custom row
router.put('/custom-rows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeUpdate('digital_shift_custom_rows', {
      ...req.body,
      updated_at: new Date()
    }, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating custom row:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete custom row
router.delete('/custom-rows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeDelete('digital_shift_custom_rows', { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom row:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 