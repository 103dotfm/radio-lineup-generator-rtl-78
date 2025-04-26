
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
    
    // IMPORTANT: Directly query digital_shifts instead of going through arrangements
    // This is a critical change to fix the connection issue
    console.log(`Running direct query on digital_shifts for day ${day}`);
    
    // Changed from const to let so we can reassign it later if needed
    let { data: shifts, error: shiftsError } = await supabase
      .from('digital_shifts')
      .select('*')
      .eq('day_of_week', day)
      .not('person_name', 'is', null)
      .not('is_hidden', 'eq', true);
    
    if (shiftsError) {
      console.error('Error fetching digital shifts:', shiftsError);
      return null;
    }
    
    console.log(`Direct query found ${shifts?.length || 0} shifts for day ${day}`);
    
    if (!shifts || shifts.length === 0) {
      console.log(`No digital shifts found directly for day ${day}, trying all arrangements`);
      
      // Fallback: Try to get all digital shifts from all arrangements for this day
      const { data: allShifts, error: allShiftsError } = await supabase
        .from('digital_shifts')
        .select('*')
        .eq('day_of_week', day)
        .not('person_name', 'is', null);
      
      if (allShiftsError) {
        console.error('Error fetching all digital shifts:', allShiftsError);
        return null;
      }
      
      console.log(`Fallback query found ${allShifts?.length || 0} shifts for day ${day} across all arrangements`);
      
      if (allShifts && allShifts.length > 0) {
        console.log('Using shifts from all arrangements as fallback');
        // Now this assignment is valid since shifts is declared with let
        shifts = allShifts;
      } else {
        console.log(`No digital shifts found for day ${day} even with fallback`);
        return null;
      }
    }
    
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
    
    // If still no matches, find any shift for that day as a final fallback
    if (matchingShifts.length === 0) {
      console.log(`No matching shifts by time, showing all shifts for day ${day} as ultimate fallback`);
      matchingShifts = shifts;
      console.log(`Using all ${matchingShifts.length} shifts for day ${day}`);
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
