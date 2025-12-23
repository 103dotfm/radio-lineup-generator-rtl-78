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

// Get producer assignments
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
    
    // Handle date conversion for week_start field
    if (formattedWhere.week_start) {
      try {
        // Convert the date to a simple date string for consistent comparison
        const date = new Date(formattedWhere.week_start);
        const dateString = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        
        // Use simple date equality instead of complex range query
        formattedWhere.week_start = dateString;
        
        console.log('Converted week_start date:', {
          original: whereConditions.week_start,
          converted: formattedWhere.week_start
        });
      } catch (dateError) {
        console.error('Error converting week_start date:', dateError);
      }
    }

    console.log('Formatted where conditions:', formattedWhere);

    // Add default filter to exclude deleted assignments unless explicitly requested
    const finalWhere = { ...formattedWhere };
    if (!finalWhere.hasOwnProperty('is_deleted')) {
      finalWhere.is_deleted = false;
    }
    
    // First get the assignments
    const assignmentsResult = await executeSelect('producer_assignments', {
      select: '*',
      where: finalWhere
    });
    
    if (assignmentsResult.error) {
      console.error('Database error:', assignmentsResult.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // Get worker IDs from assignments
    const workerIds = assignmentsResult.data.map(assignment => assignment.worker_id).filter((id, index, arr) => arr.indexOf(id) === index);
    
    // Get worker information
    let workers = [];
    if (workerIds.length > 0) {
      const workersResult = await executeSelect('workers', {
        select: 'id, name, department',
        where: { id: { in: workerIds } }
      });
      
      if (workersResult.error) {
        console.error('Error fetching workers:', workersResult.error);
      } else {
        workers = workersResult.data || [];
      }
    }
    
    // Create a map of workers by ID
    const workersMap = {};
    workers.forEach(worker => {
      workersMap[worker.id] = worker;
    });
    
    // Combine assignments with worker information
    const result = {
      data: assignmentsResult.data.map(assignment => ({
        ...assignment,
        worker: workersMap[assignment.worker_id] || null
      }))
    };
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    res.json(result.data || []);
  } catch (error) {
    console.error('Error getting producer assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create producer assignment
router.post('/', async (req, res) => {
  try {
    // Handle date conversion for week_start field
    let weekStart = req.body.week_start;
    if (weekStart) {
      try {
        // Convert the date to a simple date string for consistent storage
        const date = new Date(weekStart);
        weekStart = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        console.log('Converting week_start for storage:', {
          original: req.body.week_start,
          converted: weekStart
        });
      } catch (dateError) {
        console.error('Error converting week_start date:', dateError);
      }
    }
    
    const assignment = {
      ...req.body,
      week_start: weekStart,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await executeInsert('producer_assignments', assignment);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // Get worker information for the created assignment
    const workerResult = await executeSelect('workers', {
      select: 'id, name, department',
      where: { id: result.data[0].worker_id }
    });
    
    const worker = workerResult.data && workerResult.data.length > 0 ? workerResult.data[0] : null;
    
    res.json({
      ...result.data[0],
      worker: worker
    });
  } catch (error) {
    console.error('Error creating producer assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update producer assignment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    const result = await executeUpdate('producer_assignments', updates, { id });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // Get worker information for the updated assignment
    const workerResult = await executeSelect('workers', {
      select: 'id, name, department',
      where: { id: result.data[0].worker_id }
    });
    
    const worker = workerResult.data && workerResult.data.length > 0 ? workerResult.data[0] : null;
    
    res.json({
      ...result.data[0],
      worker: worker
    });
  } catch (error) {
    console.error('Error updating producer assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 