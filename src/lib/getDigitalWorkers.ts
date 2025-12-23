
import { api } from "@/lib/api-client";
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

export const getDigitalWorkersForShow = async (date: Date, timeString: string) => {
  try {
    // Format date as YYYY-MM-DD for database query (use local date, not UTC)
    const formattedDate = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    console.log(`Finding digital workers for exact date ${formattedDate} at time ${timeString}`);
    
    // Format time for comparison
    const formattedTime = formatTime(timeString);
    
    // Convert times to minutes for easier comparison
    const getMinutes = (time: string) => {
      const formattedTimeStr = formatTime(time);
      const [hours, minutes] = formattedTimeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    // Target time in minutes
    const targetTimeInMinutes = getMinutes(formattedTime);
    
    // First, get the digital work arrangement for this specific date
    const { data: arrangements, error: arrangementError } = await api.query('/digital-work-arrangements', {
      where: { week_start: { lte: formattedDate } },
      order: { week_start: 'desc' },
      limit: 1
    });
    
    if (arrangementError) {
      console.error('Error fetching digital work arrangement:', arrangementError);
      return null;
    }
    
    if (!arrangements || arrangements.length === 0) {
      console.log(`No digital work arrangement found that includes date ${formattedDate}`);
      return null;
    }
    
    const arrangementId = arrangements[0].id;
    console.log(`Found arrangement ${arrangementId} for date ${formattedDate}`);
    
    // Now get shifts from this arrangement
    const { data: shifts, error: shiftsError } = await api.query('/digital-shifts', {
      where: { 
        arrangement_id: arrangementId,
        person_name: { neq: null },
        is_hidden: { neq: true }
      }
    });
    
    if (shiftsError) {
      console.error('Error fetching digital shifts:', shiftsError);
      return null;
    }
    
    console.log(`Found ${shifts?.length || 0} total shifts in the selected arrangement`);
    
    if (!shifts || shifts.length === 0) {
      console.log(`No digital shifts found for date ${formattedDate}`);
      return null;
    }
    
    // Get the day of week for filtering
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    // Filter shifts for this specific day of week
    const shiftsForThisDay = shifts.filter(shift => shift.day_of_week === dayOfWeek);
    
    console.log(`Found ${shiftsForThisDay.length} shifts for day ${dayOfWeek} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`);
    
    if (shiftsForThisDay.length === 0) {
      return null;
    }
    
    // Look for shifts covering this time
    const matchingShifts = shiftsForThisDay.filter(shift => {
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
    
    // Initialize section worker map
    const sectionWorkerMap: Record<string, string[]> = {};
    prioritySections.forEach(section => {
      sectionWorkerMap[section] = [];
    });
    
    // Group by section, ensuring no duplicates
    matchingShifts.forEach(shift => {
      const section = shift.section_name;
      const workerId = shift.person_name;
      
      if (prioritySections.includes(section) && workerId && !sectionWorkerMap[section].includes(workerId)) {
        sectionWorkerMap[section].push(workerId);
      }
    });
    
    console.log('Workers by section:', sectionWorkerMap);
    
    // Build a final list with at most one worker from each priority section
    const uniqueWorkerIds = new Set<string>();
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
