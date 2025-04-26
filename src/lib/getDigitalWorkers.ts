
import { supabase } from "@/lib/supabase";
import { getWorkersByIds } from "@/lib/supabase/workers";

const formatTime = (timeString: string): string => {
  try {
    // Handle different time formats
    if (timeString.includes(':')) {
      // Already has a colon, just take HH:MM portion
      return timeString.substring(0, 5);
    } else if (timeString.length === 4) {
      // Format like "0700" to "07:00"
      return `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
    }
    return timeString;
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeString; 
  }
};

export interface DigitalShift {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  person_name: string;
  shift_type: string;
  section_name: string;
}

export const getDigitalWorkersForShow = async (day: number, timeString: string) => {
  try {
    console.log(`Finding digital workers for day ${day} at time ${timeString}`);
    
    // Format time for comparison
    const formattedTime = formatTime(timeString);
    console.log(`Formatted time for comparison: ${formattedTime}`);
    
    // Get the most recent digital work arrangement
    const { data: arrangements, error: arrangementError } = await supabase
      .from('digital_work_arrangements')
      .select('id')
      .order('week_start', { ascending: false })
      .limit(1);
    
    if (arrangementError) {
      console.error('Error fetching digital work arrangement:', arrangementError);
      return null;
    }
    
    if (!arrangements || arrangements.length === 0) {
      console.log('No digital work arrangements found');
      return null;
    }
    
    const arrangementId = arrangements[0].id;
    console.log(`Using arrangement ID: ${arrangementId}`);
    
    // Log all digital shifts to debug
    const { data: allShifts, error: allShiftsError } = await supabase
      .from('digital_shifts')
      .select('*')
      .eq('arrangement_id', arrangementId);
      
    if (allShiftsError) {
      console.error('Error fetching all digital shifts:', allShiftsError);
    } else {
      console.log(`Total digital shifts in arrangement: ${allShifts?.length || 0}`);
      console.log('All days available:', [...new Set(allShifts?.map(s => s.day_of_week) || [])]);
    }
    
    // IMPORTANT: In JavaScript, getDay() returns 0 for Sunday, 1 for Monday, etc.
    // But our database might be using a different convention
    // Let's log the exact day number we're looking for:
    console.log(`Looking for shifts on day_of_week = ${day}`);
    
    // Fetch digital shifts for the specific day
    const { data: shifts, error: shiftsError } = await supabase
      .from('digital_shifts')
      .select('*')
      .eq('arrangement_id', arrangementId)
      .eq('day_of_week', day)
      .not('person_name', 'is', null)
      .not('is_hidden', 'eq', true);
    
    if (shiftsError) {
      console.error('Error fetching digital shifts:', shiftsError);
      return null;
    }
    
    if (!shifts || shifts.length === 0) {
      console.log(`No digital shifts found for day ${day}`);
      return null;
    }
    
    console.log(`Found ${shifts.length} digital shifts for day ${day}`);
    console.log('All shifts for this day:', shifts);
    
    // Convert times to minutes for easier comparison
    const getMinutes = (time: string) => {
      const formattedTimeStr = formatTime(time);
      const [hours, minutes] = formattedTimeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const targetTimeInMinutes = getMinutes(formattedTime);
    
    // Look for shifts covering this time
    let matchingShifts = shifts.filter(shift => {
      const shiftStartInMinutes = getMinutes(shift.start_time);
      const shiftEndInMinutes = getMinutes(shift.end_time);
      
      console.log(`Checking if ${targetTimeInMinutes} (${formattedTime}) is between ${shiftStartInMinutes} (${shift.start_time}) and ${shiftEndInMinutes} (${shift.end_time}) for shift:`, shift);
      
      // Check if the target time falls within this shift's time range
      return targetTimeInMinutes >= shiftStartInMinutes && targetTimeInMinutes < shiftEndInMinutes;
    });
    
    console.log(`Found ${matchingShifts.length} shifts that contain the time ${formattedTime}`);
    
    // If no shifts cover this time, try to find shifts that start at this time (legacy behavior)
    if (matchingShifts.length === 0) {
      matchingShifts = shifts.filter(shift => {
        const shiftStartTime = formatTime(shift.start_time);
        console.log(`Checking if shift start time ${shiftStartTime} equals target time ${formattedTime}`);
        return shiftStartTime === formattedTime;
      });
      
      console.log(`Found ${matchingShifts.length} shifts with exact start time ${formattedTime}`);
    }
    
    // If still no matches, find the first shift that starts after this time
    if (matchingShifts.length === 0) {
      // Sort shifts by start time
      const sortedShifts = [...shifts].sort((a, b) => 
        getMinutes(a.start_time) - getMinutes(b.start_time)
      );
      
      // Find the first shift that starts after or at the target time
      matchingShifts = sortedShifts.filter(shift => 
        getMinutes(shift.start_time) >= targetTimeInMinutes
      ).slice(0, 1); // Take only the first one
      
      console.log(`Found ${matchingShifts.length} shifts that start after ${formattedTime}`);
      
      // If still no matches, just take the first shift of the day
      if (matchingShifts.length === 0 && sortedShifts.length > 0) {
        matchingShifts = [sortedShifts[0]];
        console.log(`Using the first shift of the day as fallback`);
      }
    }
    
    if (matchingShifts.length === 0) {
      console.log('No matching shifts found after all attempts');
      return null;
    }
    
    // Get the worker names directly
    const digitalWorkerNames = matchingShifts
      .filter(shift => shift.person_name && shift.person_name.trim() !== '')
      .map(shift => {
        console.log(`Including worker for shift:`, shift);
        return shift.person_name;
      });
    
    console.log(`Final digital worker names:`, digitalWorkerNames);
    
    if (digitalWorkerNames.length === 0) {
      console.log('No digital worker names found after filtering');
      return null;
    }
    
    // Format the credit line for digital workers
    let creditLine = "";
    
    if (digitalWorkerNames.length > 0) {
      if (digitalWorkerNames.length === 1) {
        creditLine = `בדיגיטל: ${digitalWorkerNames[0]}.`;
      } else if (digitalWorkerNames.length === 2) {
        creditLine = `בדיגיטל: ${digitalWorkerNames[0]} ו${digitalWorkerNames[1]}.`;
      } else {
        const allButLast = digitalWorkerNames.slice(0, -1).join(', ');
        const last = digitalWorkerNames[digitalWorkerNames.length - 1];
        creditLine = `בדיגיטל: ${allButLast} ו${last}.`;
      }
    }
    
    console.log(`Generated credit line: ${creditLine}`);
    return creditLine;
    
  } catch (error) {
    console.error('Error fetching digital workers:', error);
    return null;
  }
};
