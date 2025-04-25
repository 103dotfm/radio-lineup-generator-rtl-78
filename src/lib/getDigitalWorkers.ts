
import { supabase } from "@/lib/supabase";
import { getWorkersByIds } from "@/lib/supabase/workers";

const formatTime = (timeString: string): string => {
  try {
    // Extract hours and minutes from the time string (e.g., "07:00:00")
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
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
    
    // Format time for comparison (remove seconds)
    const formattedTime = formatTime(timeString);
    console.log(`Formatted time: ${formattedTime}`);
    
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
    
    // Fetch all digital shifts specifically for the digital section
    const { data: shifts, error: shiftsError } = await supabase
      .from('digital_shifts')
      .select('*')
      .eq('arrangement_id', arrangementId)
      .eq('day_of_week', day)
      .eq('section_name', 'digital_shifts') // Specifically target digital shifts
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
    console.log('All digital shifts for this day:', shifts);
    
    // Find shifts that match the time
    const matchingShifts = shifts.filter(shift => {
      const shiftStartTime = formatTime(shift.start_time);
      console.log(`Comparing shift time ${shiftStartTime} with target time ${formattedTime}`);
      return shiftStartTime === formattedTime;
    });
    
    console.log(`Found ${matchingShifts.length} matching shifts for time ${formattedTime}`);
    
    if (matchingShifts.length === 0) {
      // If no exact match, try to find shifts that contain this time
      const containingShifts = shifts.filter(shift => {
        const shiftStart = formatTime(shift.start_time);
        const shiftEnd = formatTime(shift.end_time);
        // Convert times to minutes for easier comparison
        const getMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const timeInMinutes = getMinutes(formattedTime);
        const startInMinutes = getMinutes(shiftStart);
        const endInMinutes = getMinutes(shiftEnd);
        
        // Check if the time falls within the shift's time range
        return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
      });
      
      console.log(`Found ${containingShifts.length} containing shifts for time ${formattedTime}`);
      
      if (containingShifts.length > 0) {
        console.log('Using shifts that contain this time:', containingShifts);
        matchingShifts.push(...containingShifts);
      } else {
        console.log('No shifts found that match or contain this time');
        return null;
      }
    }
    
    // Get worker names directly from the person_name field
    const digitalWorkerNames = matchingShifts.map(shift => shift.person_name);
    
    console.log(`Digital worker names:`, digitalWorkerNames);
    
    if (digitalWorkerNames.length === 0) {
      console.log('No digital worker names found');
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
