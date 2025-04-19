
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const ftp = require('basic-ftp');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON body
app.use(express.json());

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
      .eq('key', 'schedule_xml')
      .single();
      
    if (error) {
      console.error('Error fetching XML:', error);
      throw error;
    }
    
    if (!data || !data.value) {
      console.log('No XML found, generating now');
      try {
        // If no XML is available, generate it by calling the Edge Function
        const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-schedule-xml');
        
        if (functionError) {
          console.error('Error generating XML:', functionError);
          throw functionError;
        }
        
        console.log('XML generated successfully');
        // Set content type and return the XML
        res.setHeader('Content-Type', 'application/xml');
        return res.send(functionData);
      } catch (genError) {
        console.error('Failed to generate XML:', genError);
        throw new Error('Failed to generate XML: ' + genError.message);
      }
    }
    
    console.log('XML found, serving from database:', data.value.substring(0, 100) + '...');
    // Set content type and return the XML
    res.setHeader('Content-Type', 'application/xml');
    return res.send(data.value);
  } catch (error) {
    console.error('Error serving XML:', error);
    res.status(500)
      .set('Content-Type', 'application/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to serve schedule XML: ' + error.message + '</error>');
  }
});

// Handle schedule.json requests
app.get('/schedule.json', async (req, res) => {
  try {
    console.log('Serving JSON file from /schedule.json route');
    
    // Get JSON content from system_settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_json')
      .single();
      
    if (error) {
      console.error('Error fetching JSON:', error);
      throw error;
    }
    
    if (!data || !data.value) {
      console.log('No JSON found, generating now');
      try {
        // If no JSON is available, generate it by calling the Edge Function
        const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-schedule-json');
        
        if (functionError) {
          console.error('Error generating JSON:', functionError);
          throw functionError;
        }
        
        console.log('JSON generated successfully');
        // Set content type and return the JSON
        res.setHeader('Content-Type', 'application/json');
        return res.json(functionData);
      } catch (genError) {
        console.error('Failed to generate JSON:', genError);
        throw new Error('Failed to generate JSON: ' + genError.message);
      }
    }
    
    console.log('JSON found, serving from database:', data.value.substring(0, 100) + '...');
    // Set content type and return the JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Parse the JSON string into an object before sending
    try {
      const jsonData = JSON.parse(data.value);
      return res.json(jsonData);
    } catch (parseError) {
      console.error('Error parsing JSON data:', parseError);
      // If parsing fails, send the raw string
      return res.send(data.value);
    }
  } catch (error) {
    console.error('Error serving JSON:', error);
    res.status(500)
      .json({ error: 'Failed to serve schedule JSON', message: error.message });
  }
});

// API endpoint to test FTP connection
app.post('/api/test-ftp-connection', async (req, res) => {
  console.log('FTP connection test requested', JSON.stringify(req.body));
  try {
    const { server, port, username, password, passive } = req.body;
    
    // Validate required parameters
    if (!server || !port || !username || !password) {
      console.log('Missing FTP parameters:', { server, port, username, passwordProvided: !!password });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required FTP parameters' 
      });
    }
    
    console.log(`Attempting FTP connection to ${server}:${port} with user ${username}, passive mode: ${passive}`);
    
    // Set up FTP client
    const client = new ftp.Client();
    client.ftp.verbose = true; // For detailed logs
    
    try {
      // Connect to the FTP server
      await client.access({
        host: server,
        port: parseInt(port),
        user: username,
        password: password,
        secure: false,
        passive: passive === true
      });
      
      console.log('FTP connection successful. Listing directory content...');
      
      // List directory contents to verify connection
      const list = await client.list();
      console.log('Directory listing:', list.map(item => item.name).join(', '));
      
      return res.json({ 
        success: true, 
        message: 'FTP connection successful',
        directoryContents: list.length > 0 ? list.slice(0, 5).map(item => item.name) : []
      });
    } catch (ftpError) {
      console.error('FTP connection test error:', ftpError);
      return res.status(500).json({ 
        success: false, 
        message: 'FTP connection failed',
        error: ftpError.message,
        stack: ftpError.stack
      });
    } finally {
      client.close();
      console.log('FTP client closed');
    }
  } catch (error) {
    console.error('Server error testing FTP connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing FTP test request',
      error: error.message,
      stack: error.stack
    });
  }
});

// API endpoint to upload XML/JSON to FTP server
app.post('/api/upload-xml-ftp', async (req, res) => {
  console.log('FTP upload requested', JSON.stringify(req.body));
  try {
    const { server, port, username, password, remotePath, passive, fileType = 'xml' } = req.body;
    
    // Validate required parameters
    if (!server || !port || !username || !password) {
      console.log('Missing FTP upload parameters:', { server, port, username, passwordProvided: !!password });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required FTP parameters' 
      });
    }
    
    // Determine file type and settings key
    const settingsKey = fileType === 'json' ? 'schedule_json' : 'schedule_xml';
    const filename = fileType === 'json' ? 'schedule.json' : 'schedule.xml';
    const contentType = fileType === 'json' ? 'application/json' : 'application/xml';
    
    console.log(`Preparing to upload ${fileType.toUpperCase()} file '${filename}' to ${server}:${port}`);
    
    // Get the file content
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', settingsKey)
      .single();
      
    if (error || !data || !data.value) {
      console.error(`Failed to retrieve ${fileType.toUpperCase()} content:`, error);
      return res.status(500).json({ 
        success: false, 
        message: `Failed to retrieve ${fileType.toUpperCase()} content`,
        error: error?.message || `No ${fileType.toUpperCase()} content found`
      });
    }
    
    console.log(`Retrieved ${fileType.toUpperCase()} content (${data.value.length} bytes)`);
    
    // Set up FTP client
    const client = new ftp.Client();
    client.ftp.verbose = true; // For detailed logs
    
    try {
      console.log(`Connecting to FTP server ${server}:${port}`);
      
      // Connect to the FTP server
      await client.access({
        host: server,
        port: parseInt(port),
        user: username,
        password: password,
        secure: false,
        passive: passive === true
      });
      
      console.log('FTP connection successful');
      
      // Create a temp file with the content
      const tempFilePath = path.join(__dirname, filename);
      fs.writeFileSync(tempFilePath, data.value);
      console.log(`Temporary file created at ${tempFilePath}`);
      
      // Upload the file
      const uploadPath = remotePath || '/';
      console.log(`Ensuring directory exists: ${uploadPath}`);
      await client.ensureDir(uploadPath);
      
      const uploadFilePath = path.join(uploadPath, filename);
      console.log(`Uploading file to ${uploadFilePath}`);
      await client.uploadFrom(tempFilePath, uploadFilePath);
      
      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
      console.log('Temporary file deleted');
      
      // Log the success
      console.log(`${fileType.toUpperCase()} file uploaded successfully to FTP server`);
      
      return res.json({ 
        success: true, 
        message: `${fileType.toUpperCase()} file uploaded successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (ftpError) {
      console.error('FTP upload error:', ftpError);
      return res.status(500).json({ 
        success: false, 
        message: 'FTP upload failed',
        error: ftpError.message,
        stack: ftpError.stack
      });
    } finally {
      client.close();
      console.log('FTP client closed');
    }
  } catch (error) {
    console.error('Server error handling FTP upload:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing FTP upload request',
      error: error.message,
      stack: error.stack
    });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
