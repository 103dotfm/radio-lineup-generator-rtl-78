
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { renderToString } from 'react-dom/server';
import React from 'react';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('API Route: Generating JSON file from frontend schedule');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allScheduleData = [];
    
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
        const showName = slot.getAttribute('data-show-name') || '';
        const hostName = slot.getAttribute('data-host-name') || '';
        const startTime = slot.getAttribute('data-start-time') || '';
        
        // Create combined display (like in the dashboard)
        let combinedDisplay = showName;
        if (hostName && showName !== hostName) {
          combinedDisplay = `${showName} עם ${hostName}`;
        }
        
        // Add to the schedule data
        allScheduleData.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          startTime: startTime.substring(0, 5),
          endTime: slot.getAttribute('data-end-time')?.substring(0, 5) || '',
          showName: showName,
          hosts: hostName,
          combinedDisplay: combinedDisplay
        });
      });
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
