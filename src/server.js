import express from 'express';
import path from 'path';
import ftp from 'basic-ftp';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { query, switchDatabase } from './lib/db.js';
import createStorageHandler from './storage-server.js';
import { generateXmlSchedule, generateJsonSchedule } from './lib/schedule-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Error handling middleware
const asyncHandler = fn => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware to parse JSON body
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Mount storage routes
app.use('/storage', express.static(path.join(process.env.STORAGE_PATH || 'storage')));
app.use('/api/storage', createStorageHandler());

// *** API ROUTES *** - Define API routes first to ensure they take precedence

// API endpoint for WhatsApp messaging (as a fallback if Supabase functions are not working)
app.post('/api/send-whatsapp', asyncHandler(async (req, res) => {
  console.log('WhatsApp message requested', JSON.stringify(req.body));
  const { message, recipientNumber, twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = req.body;
  
  // Validate required parameters
  if (!message || !recipientNumber || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log('Missing WhatsApp parameters');
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required WhatsApp parameters' 
    });
  }
  
  console.log(`Attempting to send WhatsApp message to ${recipientNumber}`);
  
  // Format the message for Twilio WhatsApp API
  const formData = new URLSearchParams();
  formData.append('To', `whatsapp:${recipientNumber}`);
  formData.append('From', `whatsapp:${twilioPhoneNumber}`);
  formData.append('Body', message);
  
  // Call Twilio API
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      },
      body: formData.toString()
    }
  );
  
  const responseData = await response.json();
  
  if (!response.ok) {
    console.error('WhatsApp message sending error:', responseData);
    return res.status(response.status).json({ 
      success: false, 
      message: 'Failed to send WhatsApp message',
      error: responseData
    });
  }
  
  console.log('WhatsApp message sent successfully');
  return res.json({ 
    success: true, 
    message: 'WhatsApp message sent successfully',
    messageId: responseData.sid
  });
}));

// API endpoint to test FTP connection
app.post('/api/test-ftp-connection', asyncHandler(async (req, res) => {
  console.log('FTP connection test requested', JSON.stringify(req.body));
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
  client.ftp.verbose = true;
  
  try {
    // Connect to FTP server
    const accessOptions = {
      host: server,
      port: parseInt(port),
      user: username,
      password: password,
      secure: false
    };
    
    if (passive === true) {
      accessOptions.passive = true;
    }
    
    await client.access(accessOptions);
    
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
      error: ftpError.message
    });
  } finally {
    client.close();
    console.log('FTP client closed');
  }
}));

// API endpoint to upload XML/JSON to FTP server
app.post('/api/upload-xml-ftp', asyncHandler(async (req, res) => {
  console.log('FTP upload requested', JSON.stringify(req.body));
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
  
  // Get the file content from PostgreSQL
  const { data, error } = await query(
    'SELECT value FROM system_settings WHERE key = $1',
    [settingsKey]
  );
    
  if (error || !data || data.length === 0) {
    console.error(`Failed to retrieve ${fileType.toUpperCase()} content:`, error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to retrieve ${fileType.toUpperCase()} content`,
      error: error?.message || `No ${fileType.toUpperCase()} content found`
    });
  }

  const fileContent = data[0].value;
  
  // Create temporary file
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, filename);
  await fs.promises.writeFile(tempFilePath, fileContent);
  
  console.log(`Temporary file created at ${tempFilePath}`);
  
  // Set up FTP client
  const client = new ftp.Client();
  client.ftp.verbose = true;
  
  try {
    // Connect to FTP server
    const accessOptions = {
      host: server,
      port: parseInt(port),
      user: username,
      password: password,
      secure: false
    };
    
    if (passive === true) {
      accessOptions.passive = true;
    }
    
    await client.access(accessOptions);
    
    // Upload the file
    console.log(`Uploading ${tempFilePath} to ${remotePath || '/'}`);
    if (remotePath) {
      await client.ensureDir(remotePath);
      await client.cd(remotePath);
    }
    
    await client.uploadFrom(tempFilePath, filename);
    
    // Clean up temporary file
    await fs.promises.unlink(tempFilePath);
    console.log('Temporary file deleted');
    
    return res.json({ 
      success: true, 
      message: `${fileType.toUpperCase()} file uploaded successfully` 
    });
  } catch (ftpError) {
    console.error('FTP upload error:', ftpError);
    return res.status(500).json({ 
      success: false, 
      message: 'FTP upload failed',
      error: ftpError.message
    });
  } finally {
    client.close();
    console.log('FTP client closed');
    
    // Ensure temp file is cleaned up even if there was an error
    if (fs.existsSync(tempFilePath)) {
      await fs.promises.unlink(tempFilePath);
      console.log('Temporary file deleted in finally block');
    }
  }
}));

// API endpoint to get system settings
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data, error } = await query(
      'SELECT value FROM system_settings WHERE key = $1',
      [key]
    );
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Setting not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: data[0].value 
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching setting',
      error: error.message
    });
  }
});

// API endpoint to update system settings
app.post('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ 
        success: false, 
        message: 'Value is required' 
      });
    }
    
    // Check if setting exists
    const { data: existingData } = await query(
      'SELECT id FROM system_settings WHERE key = $1',
      [key]
    );
    
    let result;
    if (existingData && existingData.length > 0) {
      // Update existing setting
      result = await query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *',
        [value, key]
      );
    } else {
      // Insert new setting
      result = await query(
        'INSERT INTO system_settings (key, value) VALUES ($1, $2) RETURNING *',
        [key, value]
      );
    }
    
    if (result.error) {
      throw result.error;
    }
    
    res.json({ 
      success: true, 
      data: result.data[0] 
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating setting',
      error: error.message
    });
  }
});

// API endpoint to switch database connection
app.post('/api/settings/database', asyncHandler(async (req, res) => {
  const { type } = req.body;
  
  if (!type || !['local', 'remote'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid database type. Must be either "local" or "remote"'
    });
  }
  
  const result = await switchDatabase(type);
  
  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: 'Failed to switch database',
      error: result.error
    });
  }
  
  res.json({
    success: true,
    message: `Successfully switched to ${type} database`
  });
}));

// API endpoint to get current database type
app.get('/api/settings/database', (req, res) => {
  res.json({
    success: true,
    data: {
      type: process.env.DB_TYPE || 'remote'
    }
  });
});

// Handle schedule.xml requests
app.get('/schedule.xml', asyncHandler(async (req, res) => {
  console.log('Serving XML file from /schedule.xml route');
  
  // First try to get cached XML from system_settings
  const { data, error } = await query(
    'SELECT value FROM system_settings WHERE key = $1',
    ['schedule_xml']
  );
    
  if (error) {
    console.error('Error fetching XML:', error);
    throw error;
  }
  
  if (!data || !data.length || !data[0].value) {
    console.log('No XML found, generating now');
    // Generate new XML schedule
    const xmlContent = await generateXmlSchedule();
    
    // Cache the generated XML
    await query(
      'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      ['schedule_xml', xmlContent]
    );
    
    console.log('XML generated and cached successfully');
    res.setHeader('Content-Type', 'application/xml');
    return res.send(xmlContent);
  }
  
  console.log('XML found, serving from cache:', data[0].value.substring(0, 100) + '...');
  res.setHeader('Content-Type', 'application/xml');
  return res.send(data[0].value);
}));

// Handle schedule.json requests
app.get('/schedule.json', asyncHandler(async (req, res) => {
  console.log('Serving JSON file from /schedule.json route');
  
  // First try to get cached JSON from system_settings
  const { data, error } = await query(
    'SELECT value FROM system_settings WHERE key = $1',
    ['schedule_json']
  );
    
  if (error) {
    console.error('Error fetching JSON:', error);
    throw error;
  }
  
  if (!data || !data.length || !data[0].value) {
    console.log('No JSON found, generating now');
    // Generate new JSON schedule
    const jsonContent = await generateJsonSchedule();
    const jsonString = JSON.stringify(jsonContent);
    
    // Cache the generated JSON
    await query(
      'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      ['schedule_json', jsonString]
    );
    
    console.log('JSON generated and cached successfully');
    res.setHeader('Content-Type', 'application/json');
    return res.json(jsonContent);
  }
  
  console.log('JSON found, serving from cache:', data[0].value.substring(0, 100) + '...');
  res.setHeader('Content-Type', 'application/json');
  
  // Parse the JSON string into an object before sending
  try {
    const jsonData = JSON.parse(data[0].value);
    return res.json(jsonData);
  } catch (parseError) {
    console.error('Error parsing JSON data:', parseError);
    throw parseError;
  }
}));

// *** STATIC FILES & CATCHALL ***
// IMPORTANT: These must come AFTER all API and file serving routes

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints available at:`);
  console.log(`- POST /api/test-ftp-connection`);
  console.log(`- POST /api/upload-xml-ftp`);
  console.log(`- POST /api/send-whatsapp`);
  console.log(`- GET /schedule.xml`);
  console.log(`- GET /schedule.json`);
});
