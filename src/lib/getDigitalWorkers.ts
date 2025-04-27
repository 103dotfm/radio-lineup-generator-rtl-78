
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

export const getDigitalWorkersForShow = async (date: Date, timeString: string) => {
  try {
    // Format date as YYYY-MM-DD for database query
    const formattedDate = date.toISOString().split('T')[0];
    console.log(`Finding digital workers for date ${formattedDate} at time ${timeString}`);
    
    // Format time for comparison
    const formattedTime = formatTime(timeString);
    console.log(`Formatted time for comparison: ${formattedTime}`);
    
    // Convert times to minutes for easier comparison
    const getMinutes = (time: string) => {
      const formattedTimeStr = formatTime(time);
      const [hours, minutes] = formattedTimeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    // Target time in minutes
    const targetTimeInMinutes = getMinutes(formattedTime);
    console.log(`Target time in minutes: ${targetTimeInMinutes} (${Math.floor(targetTimeInMinutes/60)}:${targetTimeInMinutes%60})`);
    
    // Query digital shifts for the exact date (use day of week from the date)
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    const { data: shifts, error: shiftsError } = await supabase
      .from('digital_shifts')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .not('person_name', 'is', null)
      .not('is_hidden', 'eq', true);
    
    if (shiftsError) {
      console.error('Error fetching digital shifts:', shiftsError);
      return null;
    }
    
    console.log(`Found ${shifts?.length || 0} total shifts for date ${formattedDate} (day ${dayOfWeek})`);
    
    if (!shifts || shifts.length === 0) {
      console.log(`No digital shifts found for date ${formattedDate}`);
      return null;
    }
    
    // Look for shifts covering this time
    const matchingShifts = shifts.filter(shift => {
      const shiftStartInMinutes = getMinutes(shift.start_time);
      const shiftEndInMinutes = getMinutes(shift.end_time);
      
      // Check if the target time falls within this shift's time range
      return targetTimeInMinutes >= shiftStartInMinutes && targetTimeInMinutes < shiftEndInMinutes;
    });
    
    console.log(`Found ${matchingShifts.length} shifts that contain the time ${formattedTime}`);
    
    if (matchingShifts.length === 0) {
      console.log('No matching shifts found for this time');
      return null;
    }

    console.log('Matching shifts:', matchingShifts.map(s => ({
      person: s.person_name,
      section: s.section_name,
      time: `${s.start_time} - ${s.end_time}`
    })));
    
    // CRITICAL PRIORITY SECTIONS: We specifically want workers from these three sections
    const prioritySections = ['digital_shifts', 'transcription_shifts', 'live_social_shifts'];
    
    // Get unique workers from priority sections
    const uniqueWorkerIds = new Set<string>();
    const sectionWorkerMap: Record<string, string[]> = {};
    
    // First, organize by section
    prioritySections.forEach(section => {
      sectionWorkerMap[section] = [];
    });
    
    // Group by section
    matchingShifts.forEach(shift => {
      const section = shift.section_name;
      const workerId = shift.person_name;
      
      if (prioritySections.includes(section) && workerId) {
        // Add to section map if not already there
        if (!sectionWorkerMap[section].includes(workerId)) {
          sectionWorkerMap[section].push(workerId);
        }
      }
    });
    
    console.log('Workers by section:', sectionWorkerMap);
    
    // Now build a final list with at most one worker from each priority section
    const finalWorkerIds: string[] = [];
    
    // Take 1 worker from each priority section, in order
    for (const section of prioritySections) {
      if (sectionWorkerMap[section]?.length > 0) {
        // Take the first worker from this section
        const workerId = sectionWorkerMap[section][0];
        if (workerId && !uniqueWorkerIds.has(workerId)) {
          uniqueWorkerIds.add(workerId);
          finalWorkerIds.push(workerId);
          
          // Limit to 3 workers maximum
          if (finalWorkerIds.length >= 3) {
            break;
          }
        }
      }
    }
    
    console.log(`Final unique worker IDs (max 3):`, finalWorkerIds);
    
    if (finalWorkerIds.length === 0) {
      console.log('No workers found in priority sections');
      return null;
    }
    
    // Look up worker names from the workers table
    try {
      console.log('Looking up worker names from IDs:', finalWorkerIds);
      const workers = await getWorkersByIds(finalWorkerIds);
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
      const digitalWorkerNames = finalWorkerIds
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
