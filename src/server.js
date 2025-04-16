
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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle schedule.xml requests
app.get('/schedule.xml', async (req, res) => {
  try {
    console.log('Serving XML file from /schedule.xml route');
    
    // Get XML content from system_settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_xml');
      
    if (error) {
      console.error('Error fetching XML:', error);
      throw error;
    }
    
    if (!data || data.length === 0 || !data[0]?.value) {
      console.log('No XML found, generating now');
      // If no XML is available, generate it by calling the Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-schedule-xml');
      
      if (functionError) {
        console.error('Error generating XML:', functionError);
        throw functionError;
      }
      
      console.log('XML generated successfully');
      // Set content type and return the XML
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.send(functionData);
    }
    
    console.log('XML found, serving from database:', data[0].value.substring(0, 100) + '...');
    // Set content type and return the XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Add CORS headers
    return res.send(data[0].value);
  } catch (error) {
    console.error('Error serving XML:', error);
    res.status(500)
      .set('Content-Type', 'application/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to serve schedule XML</error>');
  }
});

// Add an additional endpoint for health check
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
