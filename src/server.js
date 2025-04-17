
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

// Generate XML from schedule slots
const generateScheduleXml = async () => {
  try {
    console.log('Generating schedule XML...');
    
    // Get current date info
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
    
    // Get next week's start date
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    
    // Format dates to ISO string (YYYY-MM-DD)
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    // Fetch all schedule slots
    const { data: slots, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .order('day_of_week')
      .order('start_time');
      
    if (error) {
      console.error('Error fetching schedule data:', error);
      throw error;
    }
    
    if (!slots || slots.length === 0) {
      console.warn('No schedule slots found');
      return '<?xml version="1.0" encoding="UTF-8"?><schedule><error>No schedule data available</error></schedule>';
    }

    console.log(`Found ${slots.length} schedule slots`);
    
    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schedule>\n';
    
    // Current week
    xml += `  <week start="${formatDate(currentWeekStart)}">\n`;
    
    for (let day = 0; day < 7; day++) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + day);
      
      xml += `    <day date="${formatDate(dayDate)}">\n`;
      
      const daySlots = slots.filter(slot => slot.day_of_week === day);
      
      for (const slot of daySlots) {
        const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
        const title = escapeXml(slot.show_name);
        const host = escapeXml(slot.host_name || '');
        const color = slot.color || '#59c9c6';
        
        xml += `      <show>\n`;
        xml += `        <title>${title}</title>\n`;
        xml += `        <host>${host}</host>\n`;
        xml += `        <start_time>${slot.start_time}</start_time>\n`;
        xml += `        <end_time>${endTime}</end_time>\n`;
        xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
        xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
        xml += `        <color>${color}</color>\n`;
        xml += `      </show>\n`;
      }
      
      xml += `    </day>\n`;
    }
    
    xml += `  </week>\n`;
    
    // Next week
    xml += `  <week start="${formatDate(nextWeekStart)}">\n`;
    
    for (let day = 0; day < 7; day++) {
      const dayDate = new Date(nextWeekStart);
      dayDate.setDate(nextWeekStart.getDate() + day);
      
      xml += `    <day date="${formatDate(dayDate)}">\n`;
      
      const daySlots = slots.filter(slot => slot.day_of_week === day);
      
      for (const slot of daySlots) {
        const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
        const title = escapeXml(slot.show_name);
        const host = escapeXml(slot.host_name || '');
        const color = slot.color || '#59c9c6';
        
        xml += `      <show>\n`;
        xml += `        <title>${title}</title>\n`;
        xml += `        <host>${host}</host>\n`;
        xml += `        <start_time>${slot.start_time}</start_time>\n`;
        xml += `        <end_time>${endTime}</end_time>\n`;
        xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
        xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
        xml += `        <color>${color}</color>\n`;
        xml += `      </show>\n`;
      }
      
      xml += `    </day>\n`;
    }
    
    xml += `  </week>\n`;
    xml += '</schedule>';
    
    // Save XML to database
    await supabase
      .from('system_settings')
      .upsert({
        key: 'schedule_xml',
        value: xml,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });
      
    console.log('XML generated and saved to database');
    return xml;
  } catch (error) {
    console.error('Failed to generate XML:', error);
    return '<?xml version="1.0" encoding="UTF-8"?><schedule><error>Error generating schedule</error></schedule>';
  }
};

// Helper function to calculate end time
const calculateEndTime = (startTime, durationMinutes) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes + durationMinutes;
  
  // Handle overflow to next day
  totalMinutes = totalMinutes % (24 * 60);
  
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

// Helper function to escape XML special characters
const escapeXml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Handle direct requests for schedule.xml
app.get('/schedule.xml', async (req, res) => {
  console.log('Direct request for /schedule.xml');
  
  try {
    // Check for cached XML in database
    const { data, error } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'schedule_xml')
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching cached XML:', error);
      throw error;
    }
    
    // Set XML content type headers
    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-cache');
    
    // If cached XML exists and is relatively fresh (less than 1 hour old)
    if (data && data.value && data.updated_at) {
      const updatedAt = new Date(data.updated_at);
      const now = new Date();
      const diffMs = now - updatedAt;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        console.log('Serving cached XML (updated ' + diffHours.toFixed(2) + ' hours ago)');
        return res.send(data.value);
      }
    }
    
    // Generate fresh XML if cache doesn't exist or is stale
    console.log('Generating fresh XML...');
    const xml = await generateScheduleXml();
    return res.send(xml);
  } catch (error) {
    console.error('Error serving XML:', error);
    res.status(500)
       .setHeader('Content-Type', 'application/xml; charset=UTF-8')
       .send('<?xml version="1.0" encoding="UTF-8"?><schedule><error>Failed to generate schedule XML</error></schedule>');
  }
});

// API route to force refresh XML
app.get('/api/refresh-schedule-xml', async (req, res) => {
  try {
    console.log('Manual refresh of schedule XML requested');
    const xml = await generateScheduleXml();
    res.json({ 
      success: true, 
      message: 'Schedule XML refreshed successfully',
      preview: xml.substring(0, 100) + '...' // First 100 chars
    });
  } catch (error) {
    console.error('Error refreshing XML:', error);
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
