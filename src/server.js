
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Create Supabase client
const supabase = createClient(
  'https://yyrmodgbnzqbmatlypuc.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0'
);

// CORS middleware for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle schedule.xml requests with explicit content type
app.get('/schedule.xml', async (req, res) => {
  console.log('Serving schedule.xml');
  
  try {
    // Try to get cached XML from database
    const { data, error } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'schedule_xml')
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    // Set correct XML content type
    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Return the XML data
    if (data && data.value) {
      return res.send(data.value);
    } else {
      // If no XML is found, return a simple error XML
      return res.send('<?xml version="1.0" encoding="UTF-8"?><error>No schedule data available</error>');
    }
  } catch (error) {
    console.error('Error serving XML:', error);
    res.status(500)
      .setHeader('Content-Type', 'application/xml; charset=UTF-8')
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate schedule XML</error>');
  }
});

// API route to refresh XML data
app.get('/api/refresh-schedule-xml', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Visit /schedule-xml in your browser to regenerate the XML',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
