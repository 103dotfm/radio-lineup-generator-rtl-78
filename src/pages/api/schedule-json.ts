
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import { getScheduleSlots } from '@/lib/supabase/schedule';
import { format } from 'date-fns';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('API Route: Generating JSON file');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fetch schedule slots directly using the same function that the dashboard uses
    const scheduleSlots = await getScheduleSlots(today, false);
    
    if (!scheduleSlots || scheduleSlots.length === 0) {
      console.error('API Route: No schedule data found');
      return res.status(500).json({
        error: 'No schedule data found'
      });
    }
    
    console.log(`API Route: Retrieved ${scheduleSlots.length} schedule slots from dashboard data`);
    
    // Filter out the "red" slots
    const filteredSlots = scheduleSlots.filter(slot => slot.color?.toLowerCase() !== 'red');
    console.log(`API Route: ${scheduleSlots.length - filteredSlots.length} red slots filtered out`);
    
    // Format slots for JSON output
    const formattedSchedule = filteredSlots.map(slot => {
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
      
      return {
        date: formattedDate,
        startTime: startTime,
        endTime: endTime,
        showName: showName,
        hosts: hostName,
        combinedDisplay: combinedDisplay
      };
    });
    
    // Sort by date and start time
    formattedSchedule.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Create the JSON structure
    const jsonOutput = {
      schedule: formattedSchedule
    };
    
    const jsonString = JSON.stringify(jsonOutput, null, 2);
    
    // Store the generated JSON in Supabase
    const { error: storageError } = await supabase
      .from('system_settings')
      .upsert({ 
        key: 'schedule_json', 
        value: jsonString,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (storageError) {
      console.error("API Route: Error storing JSON:", storageError);
    } else {
      console.log("API Route: JSON stored successfully");
    }
    
    // Set content type and return the JSON
    res.setHeader('Content-Type', 'application/json');
    return res.json(jsonOutput);
  } catch (error) {
    console.error('API Route: Error serving JSON:', error);
    res.status(500).json({
      error: 'Failed to serve schedule JSON',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
