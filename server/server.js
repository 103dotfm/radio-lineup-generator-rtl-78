
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer');
const fs = require('fs-extra');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const xml2js = require('xml2js');
const { format, addDays, startOfWeek } = require('date-fns');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Configure storage for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const bucket = req.params.bucket || 'lovable';
    const dir = path.join(__dirname, '../storage', bucket);
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Storage API routes
app.post('/storage/upload/:bucket?', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const bucket = req.params.bucket || 'lovable';
  const filePath = `/storage/${bucket}/${req.file.filename}`;
  
  res.json({
    data: {
      path: filePath,
      fullPath: `${req.protocol}://${req.get('host')}${filePath}`,
    }
  });
});

app.get('/storage/:bucket/:filename', (req, res) => {
  const { bucket, filename } = req.params;
  const filePath = path.join(__dirname, '../storage', bucket, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

app.get('/storage/check/:bucket/:path(*)', async (req, res) => {
  const { bucket, path } = req.params;
  const filePath = path.join(__dirname, '../storage', bucket, path);
  
  if (fs.existsSync(filePath)) {
    return res.status(200).send({ exists: true });
  } else {
    return res.status(404).send({ exists: false });
  }
});

app.delete('/storage/:bucket/:filename', (req, res) => {
  const { bucket, filename } = req.params;
  const filePath = path.join(__dirname, '../storage', bucket, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// API routes to replace Edge Functions
app.post('/api/generate-schedule-xml', async (req, res) => {
  try {
    console.log('Generating schedule XML...');
    const { previewOffset } = req.body || {};
    
    // Query database to get offset setting or use provided preview offset
    let offset = 0;
    if (previewOffset !== undefined) {
      offset = parseInt(previewOffset);
    } else {
      const offsetResult = await pool.query(
        "SELECT value FROM system_settings WHERE key = 'schedule_data_offset'"
      );
      
      if (offsetResult.rows.length > 0) {
        offset = parseInt(offsetResult.rows[0].value) || 0;
      }
    }
    
    console.log(`Using offset: ${offset} days`);
    
    // Get schedule data from database
    const scheduleSlotsResult = await pool.query(
      `SELECT 
        id, day_of_week, start_time, end_time, show_name, host_name, has_lineup
       FROM 
        schedule_slots_old
       WHERE 
        is_deleted = FALSE
       ORDER BY 
        day_of_week, start_time`
    );
    
    // Generate XML
    const builder = new xml2js.Builder({
      rootName: 'schedule',
      headless: true,
      renderOpts: {
        pretty: true,
        indent: '  ',
        newline: '\n'
      }
    });
    
    // Apply offset to dates if needed
    const today = new Date();
    if (offset !== 0) {
      today.setDate(today.getDate() + offset);
    }
    
    // Create XML structure
    const xmlObj = {
      show: scheduleSlotsResult.rows.map(slot => {
        // Calculate the date for this slot based on day of week
        const slotDate = getDateByDayOfWeek(today, slot.day_of_week);
        
        return {
          day: slot.day_of_week,
          date: format(slotDate, 'yyyy-MM-dd'),
          start_time: slot.start_time,
          end_time: slot.end_time,
          name: slot.show_name,
          host: slot.host_name || '',
          combined: slot.host_name ? `${slot.show_name} עם ${slot.host_name}` : slot.show_name,
          has_lineup: slot.has_lineup ? 'true' : 'false'
        };
      })
    };
    
    // Convert to XML
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.buildObject(xmlObj);
    
    // Store in database if this is not a preview
    if (previewOffset === undefined) {
      await pool.query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [xml, 'schedule_xml']
      );
      
      // If schedule_xml doesn't exist, insert it
      const result = await pool.query(
        'SELECT COUNT(*) FROM system_settings WHERE key = $1',
        ['schedule_xml']
      );
      
      if (parseInt(result.rows[0].count) === 0) {
        await pool.query(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          ['schedule_xml', xml]
        );
      }
    }
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating schedule XML:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedule XML',
      details: error.message 
    });
  }
});

app.post('/api/generate-schedule-json', async (req, res) => {
  try {
    console.log('Generating schedule JSON...');
    const { previewOffset } = req.body || {};
    
    // Query database to get offset setting or use provided preview offset
    let offset = 0;
    if (previewOffset !== undefined) {
      offset = parseInt(previewOffset);
    } else {
      const offsetResult = await pool.query(
        "SELECT value FROM system_settings WHERE key = 'schedule_data_offset'"
      );
      
      if (offsetResult.rows.length > 0) {
        offset = parseInt(offsetResult.rows[0].value) || 0;
      }
    }
    
    console.log(`Using offset: ${offset} days`);
    
    // Get schedule data from database
    const scheduleSlotsResult = await pool.query(
      `SELECT 
        id, day_of_week, start_time, end_time, show_name, host_name, has_lineup, 
        color, is_prerecorded, is_collection
       FROM 
        schedule_slots_old
       WHERE 
        is_deleted = FALSE
       ORDER BY 
        day_of_week, start_time`
    );
    
    // Apply offset to dates if needed
    const today = new Date();
    if (offset !== 0) {
      today.setDate(today.getDate() + offset);
    }
    
    // Create JSON structure
    const schedule = scheduleSlotsResult.rows.map(slot => {
      // Calculate the date for this slot based on day of week
      const slotDate = getDateByDayOfWeek(today, slot.day_of_week);
      
      return {
        id: slot.id,
        day: slot.day_of_week,
        date: format(slotDate, 'yyyy-MM-dd'),
        start_time: slot.start_time,
        end_time: slot.end_time,
        show_name: slot.show_name,
        host_name: slot.host_name || '',
        has_lineup: slot.has_lineup,
        color: slot.color || 'green',
        is_prerecorded: slot.is_prerecorded,
        is_collection: slot.is_collection
      };
    });
    
    const jsonData = JSON.stringify({ shows: schedule }, null, 2);
    
    // Store in database if this is not a preview
    if (previewOffset === undefined) {
      await pool.query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [jsonData, 'schedule_json']
      );
      
      // If schedule_json doesn't exist, insert it
      const result = await pool.query(
        'SELECT COUNT(*) FROM system_settings WHERE key = $1',
        ['schedule_json']
      );
      
      if (parseInt(result.rows[0].count) === 0) {
        await pool.query(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          ['schedule_json', jsonData]
        );
      }
    }
    
    res.json({ data: schedule });
  } catch (error) {
    console.error('Error generating schedule JSON:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedule JSON', 
      details: error.message 
    });
  }
});

app.post('/api/schedule-xml-refresh', async (req, res) => {
  try {
    const { refreshInterval } = req.body || {};
    
    // Update the refresh interval if provided
    if (refreshInterval) {
      await pool.query(
        'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [refreshInterval.toString(), 'schedule_xml_refresh_interval']
      );
    }
    
    // Get current refresh interval
    const intervalResult = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'schedule_xml_refresh_interval'"
    );
    
    let interval = 10; // Default to 10 minutes
    if (intervalResult.rows.length > 0) {
      interval = parseInt(intervalResult.rows[0].value) || 10;
    }
    
    console.log(`Schedule XML refresh set to ${interval} minutes`);
    
    // Schedule the job (this actually happens in the cron.js file,
    // but we'll return success here)
    
    res.json({ 
      success: true,
      message: `XML refresh scheduled every ${interval} minutes`
    });
  } catch (error) {
    console.error('Error updating scheduler:', error);
    res.status(500).json({ error: 'Failed to update scheduler' });
  }
});

app.post('/api/send-lineup-email', async (req, res) => {
  try {
    const { showId } = req.body;
    
    if (!showId) {
      return res.status(400).json({ error: 'Show ID is required' });
    }
    
    // Get show data
    const showResult = await pool.query(
      'SELECT id, name, date, time, notes FROM shows_backup WHERE id = $1',
      [showId]
    );
    
    if (showResult.rows.length === 0) {
      return res.status(404).json({ error: 'Show not found' });
    }
    
    const show = showResult.rows[0];
    
    // Get show items
    const itemsResult = await pool.query(
      `SELECT * FROM show_items WHERE show_id = $1 ORDER BY position`,
      [showId]
    );
    
    const showItems = itemsResult.rows;
    
    // Get email settings
    const settingsResult = await pool.query('SELECT * FROM email_settings LIMIT 1');
    
    if (settingsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email settings not found' });
    }
    
    const emailSettings = settingsResult.rows[0];
    
    // Get recipients
    const recipientsResult = await pool.query('SELECT email FROM email_recipients');
    const recipients = recipientsResult.rows.map(row => row.email);
    
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found' });
    }
    
    // Generate email content
    const subject = emailSettings.subject_template.replace('{{show_name}}', show.name);
    
    // Create email HTML content
    let html = `<h1>${show.name}</h1>`;
    if (show.date) {
      html += `<p><strong>תאריך:</strong> ${show.date}</p>`;
    }
    if (show.time) {
      html += `<p><strong>שעה:</strong> ${show.time}</p>`;
    }
    
    if (showItems.length > 0) {
      html += '<h2>פריטים:</h2><ul>';
      for (const item of showItems) {
        html += `<li>`;
        
        if (item.is_break) {
          html += `<strong>הפסקה</strong>`;
        } else if (item.is_note) {
          html += `<strong>הערה:</strong> ${item.name}`;
        } else if (item.is_divider) {
          html += `<strong>--- ${item.name} ---</strong>`;
        } else {
          html += `<strong>${item.name}</strong>`;
          
          if (item.title) {
            html += ` - ${item.title}`;
          }
          
          if (item.details) {
            html += `<div>${item.details}</div>`;
          }
        }
        
        html += `</li>`;
      }
      html += '</ul>';
    }
    
    if (show.notes) {
      html += `<h2>הערות:</h2><p>${show.notes}</p>`;
    }
    
    // Create email transporter based on email method
    let transporter;
    
    if (emailSettings.email_method === 'smtp') {
      transporter = nodemailer.createTransport({
        host: emailSettings.smtp_host,
        port: emailSettings.smtp_port,
        secure: emailSettings.smtp_port === 465,
        auth: {
          user: emailSettings.smtp_user,
          pass: emailSettings.smtp_password,
        },
      });
    } else {
      return res.status(400).json({ error: `Unsupported email method: ${emailSettings.email_method}` });
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: `${emailSettings.sender_name} <${emailSettings.sender_email}>`,
      to: recipients.join(','),
      subject,
      html,
    });
    
    // Log the email sending
    await pool.query(
      'INSERT INTO show_email_logs (show_id, success) VALUES ($1, $2)',
      [showId, true]
    );
    
    res.json({ 
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending lineup email:', error);
    
    // Log the error
    if (req.body && req.body.showId) {
      await pool.query(
        'INSERT INTO show_email_logs (show_id, success, error_message) VALUES ($1, $2, $3)',
        [req.body.showId, false, error.message]
      );
    }
    
    res.status(500).json({ 
      error: 'Failed to send lineup email',
      details: error.message
    });
  }
});

app.post('/api/execute-sql', (req, res) => {
  // Security note: This endpoint would be highly restricted in production
  // and only accessible to admins with proper authentication
  res.status(403).json({ error: 'This endpoint is disabled for security reasons' });
});

// API endpoint to serve XML file
app.get('/schedule.xml', async (req, res) => {
  try {
    // Get XML from the database
    const result = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'schedule_xml'"
    );
    
    if (result.rows.length === 0) {
      // Generate XML on the fly if it doesn't exist
      const response = await axios.post(`http://localhost:${PORT}/api/generate-schedule-xml`);
      res.header('Content-Type', 'application/xml');
      res.send(response.data);
      return;
    }
    
    res.header('Content-Type', 'application/xml');
    res.send(result.rows[0].value);
  } catch (error) {
    console.error('Error serving schedule.xml:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to serve schedule XML</error>');
  }
});

// API endpoint to serve JSON file
app.get('/schedule.json', async (req, res) => {
  try {
    // Get JSON from the database
    const result = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'schedule_json'"
    );
    
    if (result.rows.length === 0) {
      // Generate JSON on the fly if it doesn't exist
      const response = await axios.post(`http://localhost:${PORT}/api/generate-schedule-json`);
      res.json(response.data);
      return;
    }
    
    res.header('Content-Type', 'application/json');
    res.send(result.rows[0].value);
  } catch (error) {
    console.error('Error serving schedule.json:', error);
    res.status(500).json({ error: 'Failed to serve schedule JSON' });
  }
});

// Helper function to get a date by day of week
function getDateByDayOfWeek(baseDate, dayOfWeek) {
  const currentDate = new Date(baseDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // 0 = Sunday
  return addDays(weekStart, dayOfWeek);
}

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access application at http://localhost:${PORT}`);
});

// Setup cron jobs for scheduled tasks
setupCronJobs();

function setupCronJobs() {
  // Schedule XML generation
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('Running scheduled XML generation');
      
      // Get refresh interval from settings
      const intervalResult = await pool.query(
        "SELECT value FROM system_settings WHERE key = 'schedule_xml_refresh_interval'"
      );
      
      let interval = 10; // Default to 10 minutes
      if (intervalResult.rows.length > 0) {
        interval = parseInt(intervalResult.rows[0].value) || 10;
      }
      
      // Only proceed if we're at the right interval
      const currentMinute = new Date().getMinutes();
      if (currentMinute % interval !== 0) {
        return;
      }
      
      // Generate XML
      await fetch(`http://localhost:${PORT}/api/generate-schedule-xml`, {
        method: 'POST'
      });
      
      // Generate JSON
      await fetch(`http://localhost:${PORT}/api/generate-schedule-json`, {
        method: 'POST'
      });
      
      console.log('Scheduled generation completed successfully');
    } catch (error) {
      console.error('Error in scheduled generation:', error);
    }
  });
}
