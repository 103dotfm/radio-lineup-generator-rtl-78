
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
    
    // Fetch digital shifts for the day without additional filtering
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
    
    // Instead of exact time matching first, directly look for shifts covering this time
    let matchingShifts = shifts.filter(shift => {
      // Convert times to minutes for easier comparison
      const getMinutes = (time: string) => {
        const formattedTimeStr = formatTime(time);
        const [hours, minutes] = formattedTimeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const targetTimeInMinutes = getMinutes(formattedTime);
      const shiftStartInMinutes = getMinutes(shift.start_time);
      const shiftEndInMinutes = getMinutes(shift.end_time);
      
      console.log(`Checking if ${targetTimeInMinutes} is between ${shiftStartInMinutes} and ${shiftEndInMinutes} for shift:`, shift);
      
      // Check if the target time falls within this shift's time range
      return targetTimeInMinutes >= shiftStartInMinutes && targetTimeInMinutes < shiftEndInMinutes;
    });
    
    console.log(`Found ${matchingShifts.length} shifts that contain the time ${formattedTime}`);
    
    if (matchingShifts.length === 0) {
      // If no shifts cover this time, try to find shifts that start at this time (legacy behavior)
      matchingShifts = shifts.filter(shift => {
        const shiftStartTime = formatTime(shift.start_time);
        console.log(`Checking if shift start time ${shiftStartTime} equals target time ${formattedTime}`);
        return shiftStartTime === formattedTime;
      });
      
      console.log(`Found ${matchingShifts.length} matching shifts with exact start time ${formattedTime}`);
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
