
import { supabase } from "@/lib/supabase";
import { getWorkersByIds } from "@/lib/supabase/workers";
import { Worker } from "@/lib/supabase/workers";

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
    
    // Convert times to minutes for easier comparison
    const getMinutes = (time: string) => {
      const formattedTimeStr = formatTime(time);
      const [hours, minutes] = formattedTimeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    // Add 5 minutes to the target time for more accurate shift matching
    const targetTimeInMinutes = getMinutes(formattedTime) + 5;
    console.log(`Using shifted target time: ${Math.floor(targetTimeInMinutes/60)}:${targetTimeInMinutes%60} (${targetTimeInMinutes} minutes)`);
    
    // Query digital_shifts for the specified day
    const { data: shifts, error: shiftsError } = await supabase
      .from('digital_shifts')
      .select('*')
      .eq('day_of_week', day)
      .not('person_name', 'is', null)
      .not('is_hidden', 'eq', true);
    
    if (shiftsError) {
      console.error('Error fetching digital shifts:', shiftsError);
      return null;
    }
    
    console.log(`Found ${shifts?.length || 0} total shifts for day ${day}`);
    
    if (!shifts || shifts.length === 0) {
      console.log(`No digital shifts found for day ${day}`);
      return null;
    }
    
    // Look for shifts covering this time
    const matchingShifts = shifts.filter(shift => {
      const shiftStartInMinutes = getMinutes(shift.start_time);
      const shiftEndInMinutes = getMinutes(shift.end_time);
      
      // Check if the target time falls within this shift's time range
      return targetTimeInMinutes >= shiftStartInMinutes && targetTimeInMinutes < shiftEndInMinutes;
    });
    
    console.log(`Found ${matchingShifts.length} shifts that contain the time ${formattedTime} (with 5-minute offset)`);
    
    if (matchingShifts.length === 0) {
      console.log('No matching shifts found for this time');
      return null;
    }
    
    // Group shifts by section and take the most relevant worker from each
    const sectionMap: Record<string, string> = {};
    
    // Priority sections we want to include
    const prioritySections = ['digital_shifts', 'transcription_shifts', 'live_social_shifts'];
    
    matchingShifts.forEach(shift => {
      if (shift.person_name && shift.section_name) {
        // Only store if section is not yet present or this is a higher priority section
        if (!sectionMap[shift.section_name]) {
          sectionMap[shift.section_name] = shift.person_name;
        }
      }
    });
    
    // Extract worker IDs from the priority sections
    const workerIds: string[] = [];
    
    // Add workers in the order of priority sections
    prioritySections.forEach(section => {
      if (sectionMap[section]) {
        workerIds.push(sectionMap[section]);
      }
    });
    
    console.log(`Found ${workerIds.length} unique workers from priority sections:`, workerIds);
    
    if (workerIds.length === 0) {
      console.log('No workers found in priority sections');
      return null;
    }
    
    // Look up worker names from the workers table
    try {
      console.log('Looking up worker names from IDs:', workerIds);
      const workers = await getWorkersByIds(workerIds);
      console.log('Workers found:', workers);
      
      if (!workers || workers.length === 0) {
        console.log('No workers found by IDs');
        return null;
      }
      
      // Map worker IDs to their names
      const workerNameMap: { [key: string]: string } = {};
      workers.forEach(worker => {
        workerNameMap[worker.id] = worker.name;
      });
      
      // Get actual names using the map
      const digitalWorkerNames = workerIds
        .filter(id => workerNameMap[id]) // Only include IDs that have matching names
        .map(id => workerNameMap[id]);
      
      console.log(`Final digital worker names:`, digitalWorkerNames);
      
      if (digitalWorkerNames.length === 0) {
        console.log('No digital worker names found after mapping');
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
    } catch (workerLookupError) {
      console.error('Error looking up worker names:', workerLookupError);
      return null;
    }
    
  } catch (error) {
    console.error('Error fetching digital workers:', error);
    return null;
  }
};
