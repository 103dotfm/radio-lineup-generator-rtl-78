
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { renderToString } from 'react-dom/server';
import React from 'react';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('API Route: Generating XML file from frontend schedule');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schedule>\n';
    
    // Process next 10 days
    for (let i = 0; i < 10; i++) {
      const currentDate = addDays(today, i);
      console.log(`Processing schedule for date: ${format(currentDate, 'yyyy-MM-dd')}`);
      
      // Render the schedule component to string for this specific date
      const scheduleHtml = renderToString(
        React.createElement(ScheduleView, {
          selectedDate: currentDate,
          viewMode: "daily",
          hideDateControls: true,
          hideHeaderDates: true
        })
      );
      
      // Parse the rendered HTML to extract schedule data
      const parser = new DOMParser();
      const doc = parser.parseFromString(scheduleHtml, 'text/html');
      
      // Find all schedule slots in the rendered output
      const slots = doc.querySelectorAll('.schedule-slot');
      
      slots.forEach(slot => {
        // Skip red slots
        const slotColor = slot.getAttribute('data-color')?.toLowerCase();
        if (slotColor === 'red') return;
        
        // Extract data from the slot
        const showName = escapeXml(slot.getAttribute('data-show-name') || '');
        const hostName = escapeXml(slot.getAttribute('data-host-name') || '');
        const startTime = slot.getAttribute('data-start-time')?.substring(0, 5) || '';
        const endTime = slot.getAttribute('data-end-time')?.substring(0, 5) || '';
        
        // Create combined display (like in the dashboard)
        let combinedDisplay = showName;
        if (hostName && showName !== hostName) {
          combinedDisplay = `${showName} עם ${hostName}`;
        }
        
        // Add to XML
        xml += `  <show>\n`;
        xml += `    <date>${format(currentDate, 'yyyy-MM-dd')}</date>\n`;
        xml += `    <start_time>${startTime}</start_time>\n`;
        xml += `    <end_time>${endTime}</end_time>\n`;
        xml += `    <name>${showName}</name>\n`;
        xml += `    <host>${hostName}</host>\n`;
        xml += `    <combined>${escapeXml(combinedDisplay)}</combined>\n`;
        xml += `  </show>\n`;
      });
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
