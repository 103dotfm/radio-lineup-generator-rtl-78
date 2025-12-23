import express from 'express';
import { executeSelect } from '../utils/db.js';

const router = express.Router();

// Search show items (interviewees and content)
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('Searching show_items with query:', query);

    const result = await executeSelect('show_items', {
      select: '*',
      where: {
        'or': [
          { 'name ILIKE': `%${query}%` },
          { 'title ILIKE': `%${query}%` },
          { 'details ILIKE': `%${query}%` }
        ]
      },
      orderBy: { created_at: 'DESC' },
      limit: 500 // Increased limit significantly
    });
    
    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    console.log(`Found ${result.data?.length || 0} items matching "${query}"`);
    res.json(result.data || []);
  } catch (error) {
    console.error('Error searching show items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get show items with their associated show information
router.get('/with-shows', async (req, res) => {
  try {
    const { query, limit = 200 } = req.query; // Increased default limit
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('Searching show_items with shows info, query:', query);

    // First, find matching items
    const itemsResult = await executeSelect('show_items', {
      select: '*',
      where: {
        'or': [
          { 'name ILIKE': `%${query}%` },
          { 'title ILIKE': `%${query}%` },
          { 'details ILIKE': `%${query}%` }
        ]
      },
      orderBy: { created_at: 'DESC' },
      limit: parseInt(limit)
    });
    
    if (itemsResult.error) {
      console.error('Database error fetching items:', itemsResult.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    console.log(`Found ${itemsResult.data?.length || 0} items matching "${query}" in with-shows search`);

    if (!itemsResult.data || itemsResult.data.length === 0) {
      return res.json([]);
    }

    // Get unique show IDs
    const showIds = [...new Set(itemsResult.data.map(item => item.show_id))];
    console.log(`Found ${showIds.length} unique show IDs`);
    
    // Fetch associated shows
    const showsResult = await executeSelect('shows_backup', {
      select: '*',
      where: {
        'id = ANY': showIds
      }
    });
    
    if (showsResult.error) {
      console.error('Database error fetching shows:', showsResult.error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    console.log(`Found ${showsResult.data?.length || 0} associated shows`);

    // Combine items with their show information
    const showsMap = new Map(showsResult.data?.map(show => [show.id, show]) || []);
    
    const itemsWithShows = itemsResult.data.map(item => ({
      ...item,
      show: showsMap.get(item.show_id)
    }));

    res.json(itemsWithShows);
  } catch (error) {
    console.error('Error searching show items with shows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 