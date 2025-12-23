import express from 'express';
import { executeSelect, executeInsert, executeUpdate } from '../utils/db.js';

const router = express.Router();

// Get producer roles
router.get('/', async (req, res) => {
  try {
    const result = await executeSelect('producer_roles', {
      select: '*',
      orderBy: { display_order: 'asc' }
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // Return the array directly instead of wrapping it
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting producer roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ensure producer roles exist
router.post('/ensure', async (req, res) => {
  try {
    const { roles } = req.body;
    
    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'Roles must be an array' });
    }

    // Get existing roles
    const existingRoles = await executeSelect('producer_roles', {
      select: 'id'
    });
    
    if (existingRoles.error) {
      console.error('Database error:', existingRoles.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    const existingIds = new Set((existingRoles.data || []).map(role => role.id));
    
    // Insert missing roles
    for (const role of roles) {
      if (!existingIds.has(role.id)) {
        const result = await executeInsert('producer_roles', {
          ...role,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        if (result.error) {
          console.error('Error inserting role:', result.error);
          return res.status(500).json({ error: 'Database error occurred' });
        }
      } else {
        // Update existing role
        const result = await executeUpdate('producer_roles', {
          name: role.name,
          display_order: role.display_order,
          updated_at: new Date()
        }, {
          id: role.id
        });
        
        if (result.error) {
          console.error('Error updating role:', result.error);
          return res.status(500).json({ error: 'Database error occurred' });
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error ensuring producer roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create producer role
router.post('/', async (req, res) => {
  try {
    const { id, name, display_order } = req.body;
    
    // First check if role already exists
    const existingRole = await executeSelect('producer_roles', {
      select: '*',
      where: { id }
    });
    
    if (existingRole.error) {
      console.error('Database error:', existingRole.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    if (existingRole.data?.length > 0) {
      return res.json(existingRole.data[0]);
    }
    
    // Create new role
    const result = await executeInsert('producer_roles', {
      id,
      name,
      display_order,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error creating producer role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update producer role
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_order } = req.body;
    
    const result = await executeUpdate('producer_roles', {
      name,
      display_order,
      updated_at: new Date()
    }, {
      id
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating producer role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 