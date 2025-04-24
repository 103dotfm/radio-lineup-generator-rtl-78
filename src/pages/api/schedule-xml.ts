
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import { getScheduleSlots } from '@/lib/supabase/schedule';
import { format } from 'date-fns';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('API Route: Generating XML file');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fetch schedule slots directly using the same function that the dashboard uses
    const scheduleSlots = await getScheduleSlots(today, false);
    
    if (!scheduleSlots || scheduleSlots.length === 0) {
      console.error('API Route: No schedule data found');
      return res.status(500)
        .set('Content-Type', 'application/xml')
        .send('<?xml version="1.0" encoding="UTF-8"?><error>No schedule data found</error>');
    }
    
    console.log(`API Route: Retrieved ${scheduleSlots.length} schedule slots from dashboard data`);
    
    // Filter out the "red" slots
    const filteredSlots = scheduleSlots.filter(slot => slot.color?.toLowerCase() !== 'red');
    console.log(`API Route: ${scheduleSlots.length - filteredSlots.length} red slots filtered out`);
    
    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schedule>\n';
    
    // Sort by date and start time
    filteredSlots.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      
      if (dateA !== dateB) return dateA - dateB;
      return a.start_time.localeCompare(b.start_time);
    });
    
    // Process each slot
    for (const slot of filteredSlots) {
      // Format the date to YYYY-MM-DD
      const formattedDate = slot.date ? format(new Date(slot.date), 'yyyy-MM-dd') : '';
      
      // Format times as HH:MM
      const startTime = slot.start_time.substring(0, 5);
      const endTime = slot.end_time.substring(0, 5);
      
      // Get show and host display information
      const showName = slot.show_name || '';
      const hostName = slot.host_name || '';
      
      // Create combined display (like in the dashboard)
      let combinedDisplay = showName;
      if (hostName && showName !== hostName) {
        combinedDisplay = `${showName} עם ${hostName}`;
      }
      
      // Add to XML
      xml += `  <show>\n`;
      xml += `    <date>${formattedDate}</date>\n`;
      xml += `    <start_time>${startTime}</start_time>\n`;
      xml += `    <end_time>${endTime}</end_time>\n`;
      xml += `    <name>${escapeXml(showName)}</name>\n`;
      xml += `    <host>${escapeXml(hostName)}</host>\n`;
      xml += `    <combined>${escapeXml(combinedDisplay)}</combined>\n`;
      xml += `  </show>\n`;
    }
    
    xml += '</schedule>';
    
    // Store the generated XML in Supabase
    const { error: storageError } = await supabase
      .from('system_settings')
      .upsert({ 
        key: 'schedule_xml', 
        value: xml,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (storageError) {
      console.error("API Route: Error storing XML:", storageError);
    } else {
      console.log("API Route: XML stored successfully");
    }
    
    // Set content type and return the XML
    res.setHeader('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (error) {
    console.error('API Route: Error serving XML:', error);
    res.status(500)
      .set('Content-Type', 'application/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to serve schedule XML</error>');
  }
}

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
