
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import { getScheduleSlots } from '@/lib/supabase/schedule';
import { format, addDays } from 'date-fns';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('API Route: Generating JSON file');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allScheduleData = [];
    
    // Fetch data for the next 10 days
    for (let i = 0; i < 10; i++) {
      const currentDate = addDays(today, i);
      console.log(`Fetching schedule for date: ${format(currentDate, 'yyyy-MM-dd')}`);
      
      // Fetch schedule slots for this specific date
      const scheduleSlots = await getScheduleSlots(currentDate, false);
      
      if (!scheduleSlots || scheduleSlots.length === 0) {
        console.log(`No schedule data found for ${format(currentDate, 'yyyy-MM-dd')}`);
        continue;
      }
      
      // Filter out the "red" slots
      const filteredSlots = scheduleSlots.filter(slot => slot.color?.toLowerCase() !== 'red');
      
      // Format slots for this day
      const formattedSlots = filteredSlots.map(slot => {
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
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime: startTime,
          endTime: endTime,
          showName: showName,
          hosts: hostName,
          combinedDisplay: combinedDisplay
        };
      });
      
      allScheduleData.push(...formattedSlots);
    }
    
    // Sort by date and start time
    allScheduleData.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Create the JSON structure
    const jsonOutput = {
      schedule: allScheduleData
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
