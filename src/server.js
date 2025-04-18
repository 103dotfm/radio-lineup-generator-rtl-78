
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { format, startOfWeek, addDays, addWeeks } = require('date-fns');

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

// Function to generate XML from schedule data
async function generateScheduleXml() {
  try {
    // Get today's date and start of week
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    
    // Fetch schedule data for the current and next week
    const { data: slots, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .gte('day_of_week', 0)
      .lte('day_of_week', 6)
      .order('day_of_week')
      .order('start_time');
      
    if (error) {
      console.error('Error fetching schedule data:', error);
      throw error;
    }
    
    // Start building XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schedule>\n';
    
    // Generate XML for current week
    xml += `  <week start="${format(currentWeekStart, 'yyyy-MM-dd')}">\n`;
    for (let day = 0; day < 7; day++) {
      const dayDate = addDays(currentWeekStart, day);
      const daySlots = slots.filter(slot => slot.day_of_week === day);
      
      xml += `    <day date="${format(dayDate, 'yyyy-MM-dd')}">\n`;
      
      for (const slot of daySlots) {
        const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
        
        xml += `      <show>\n`;
        xml += `        <title>${escapeXml(slot.show_name)}</title>\n`;
        xml += `        <host>${escapeXml(slot.host_name || '')}</host>\n`;
        xml += `        <start_time>${slot.start_time}</start_time>\n`;
        xml += `        <end_time>${endTime}</end_time>\n`;
        xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
        xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
        xml += `        <color>${slot.color || '#59c9c6'}</color>\n`;
        xml += `      </show>\n`;
      }
      
      xml += `    </day>\n`;
    }
    xml += `  </week>\n`;
    
    // Generate XML for next week
    xml += `  <week start="${format(nextWeekStart, 'yyyy-MM-dd')}">\n`;
    for (let day = 0; day < 7; day++) {
      const dayDate = addDays(nextWeekStart, day);
      const daySlots = slots.filter(slot => slot.day_of_week === day);
      
      xml += `    <day date="${format(dayDate, 'yyyy-MM-dd')}">\n`;
      
      for (const slot of daySlots) {
        const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
        
        xml += `      <show>\n`;
        xml += `        <title>${escapeXml(slot.show_name)}</title>\n`;
        xml += `        <host>${escapeXml(slot.host_name || '')}</host>\n`;
        xml += `        <start_time>${slot.start_time}</start_time>\n`;
        xml += `        <end_time>${endTime}</end_time>\n`;
        xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
        xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
        xml += `        <color>${slot.color || '#59c9c6'}</color>\n`;
        xml += `      </show>\n`;
      }
      
      xml += `    </day>\n`;
    }
    xml += `  </week>\n`;
    
    // Close XML
    xml += '</schedule>';
    
    // Save to database for caching
    await supabase
      .from('system_settings')
      .upsert({
        key: 'schedule_xml',
        value: xml,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });
      
    return xml;
  } catch (error) {
    console.error('Error generating XML:', error);
    throw error;
  }
}

// Helper function to calculate end time
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes + durationMinutes;
  
  // Handle overflow to next day
  totalMinutes = totalMinutes % (24 * 60);
  
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Handle schedule.xml requests - explicitly set Content-Type for XML
app.get('/schedule.xml', async (req, res) => {
  try {
    console.log('Serving schedule.xml');
    
    // Try to get cached XML content from database first
    const { data, error } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'schedule_xml')
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching XML from database:', error);
      throw error;
    }
    
    // Set correct content type for XML
    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Check if cached XML exists and is less than 1 hour old
    const now = new Date();
    const cachedXmlAge = data?.updated_at 
      ? (now.getTime() - new Date(data.updated_at).getTime()) / 1000 / 60 
      : Infinity;
      
    if (data?.value && cachedXmlAge < 60) {
      console.log('Serving cached XML from database');
      return res.send(data.value);
    } else {
      console.log('Generating fresh XML');
      const xml = await generateScheduleXml();
      return res.send(xml);
    }
  } catch (error) {
    console.error('Error serving XML:', error);
    // Return error as XML
    res.status(500)
      .setHeader('Content-Type', 'application/xml; charset=UTF-8')
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate schedule XML</error>');
  }
});

// Add a dedicated route for manually refreshing the XML
app.get('/api/refresh-schedule-xml', async (req, res) => {
  try {
    console.log('Manually refreshing schedule XML');
    const xml = await generateScheduleXml();
    res.json({ 
      success: true, 
      message: 'Schedule XML refreshed successfully',
      timestamp: new Date().toISOString(),
      xmlLength: xml.length
    });
  } catch (error) {
    console.error('Error refreshing XML:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh schedule XML' 
    });
  }
});

// Add a dedicated route for health check
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
