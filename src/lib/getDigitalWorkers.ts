
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
    
    // IMPORTANT: Directly query digital_shifts instead of going through arrangements
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
        shifts = allShifts;
      } else {
        console.log(`No digital shifts found for day ${day} even with fallback`);
        return null;
      }
    }
    
    // Look for shifts covering this time
    let matchingShifts = shifts.filter(shift => {
      const shiftStartInMinutes = getMinutes(shift.start_time);
      const shiftEndInMinutes = getMinutes(shift.end_time);
      
      // Check if the target time falls within this shift's time range
      return targetTimeInMinutes >= shiftStartInMinutes && targetTimeInMinutes < shiftEndInMinutes;
    });
    
    console.log(`Found ${matchingShifts.length} shifts that contain the time ${formattedTime} (with 5-minute offset)`);
    
    // If no shifts cover this time, try to find shifts that start at this time
    if (matchingShifts.length === 0) {
      matchingShifts = shifts.filter(shift => {
        const shiftStartTime = formatTime(shift.start_time);
        return shiftStartTime === formattedTime;
      });
      
      console.log(`Found ${matchingShifts.length} shifts with exact start time ${formattedTime}`);
    }
    
    // If still no matches, get the shifts with the closest start time
    if (matchingShifts.length === 0) {
      // Find the shift with the closest start time to the target time
      let closestShift = null;
      let minTimeDifference = Infinity;
      
      for (const shift of shifts) {
        const shiftStartInMinutes = getMinutes(shift.start_time);
        const timeDifference = Math.abs(targetTimeInMinutes - shiftStartInMinutes);
        
        if (timeDifference < minTimeDifference) {
          minTimeDifference = timeDifference;
          closestShift = shift;
        }
      }
      
      if (closestShift) {
        console.log(`No exact matches found, using closest shift with start time ${closestShift.start_time}`);
        matchingShifts = [closestShift];
      }
    }
    
    if (matchingShifts.length === 0) {
      console.log('No matching shifts found after all attempts');
      return null;
    }
    
    // Filter for unique workers (since same person can have multiple shifts)
    // and prioritize workers from specific sections
    const prioritySections = ['digital_shifts', 'live_social_shifts', 'transcription_shifts'];
    
    // Create a map to track unique worker IDs and their priority
    const uniqueWorkerMap = new Map();
    
    matchingShifts.forEach(shift => {
      if (shift.person_name && shift.person_name.trim() !== '') {
        const workerId = shift.person_name;
        const sectionPriority = prioritySections.indexOf(shift.section_name);
        
        // If worker isn't in map, or new occurrence has higher priority, update the map
        if (!uniqueWorkerMap.has(workerId) || 
            (sectionPriority > -1 && sectionPriority < uniqueWorkerMap.get(workerId).priority)) {
          uniqueWorkerMap.set(workerId, {
            id: workerId,
            priority: sectionPriority > -1 ? sectionPriority : 999
          });
        }
      }
    });
    
    // Convert map to array and sort by priority
    const uniqueWorkerIds = Array.from(uniqueWorkerMap.values())
      .sort((a, b) => a.priority - b.priority)
      .map(worker => worker.id)
      .slice(0, 3); // Limit to top 3 workers
    
    console.log(`Filtered to ${uniqueWorkerIds.length} unique workers (limit 3):`, uniqueWorkerIds);
    
    if (uniqueWorkerIds.length === 0) {
      console.log('No worker IDs found after filtering');
      return null;
    }

    // Look up worker names from the workers table using the IDs
    try {
      console.log('Looking up worker names from IDs:', uniqueWorkerIds);
      const workers = await getWorkersByIds(uniqueWorkerIds);
      console.log('Workers found:', workers);
      
      // Map worker IDs to their names
      const workerNameMap: { [key: string]: string } = {};
      workers.forEach(worker => {
        workerNameMap[worker.id] = worker.name;
      });
      
      // Get actual names using the map
      const digitalWorkerNames = uniqueWorkerIds.map(id => {
        const name = workerNameMap[id];
        if (!name) {
          console.log(`Could not find name for worker ID: ${id}`);
          return id; // Fall back to ID if name not found
        }
        return name;
      });
      
      console.log(`Final digital worker names (limited):`, digitalWorkerNames);
      
      if (digitalWorkerNames.length === 0) {
        console.log('No digital worker names found after looking up names');
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
      
      console.log(`Generated credit line with actual names: ${creditLine}`);
      return creditLine;
    } catch (workerLookupError) {
      console.error('Error looking up worker names:', workerLookupError);
      
      // Fall back to using IDs if name lookup fails
      console.log('Falling back to using IDs instead of names due to lookup error');
      
      // Format the credit line for digital workers using IDs (limited to 3)
      let creditLine = "";
      
      if (uniqueWorkerIds.length > 0) {
        if (uniqueWorkerIds.length === 1) {
          creditLine = `בדיגיטל: ${uniqueWorkerIds[0]}.`;
        } else if (uniqueWorkerIds.length === 2) {
          creditLine = `בדיגיטל: ${uniqueWorkerIds[0]} ו${uniqueWorkerIds[1]}.`;
        } else {
          const allButLast = uniqueWorkerIds.slice(0, -1).join(', ');
          const last = uniqueWorkerIds[uniqueWorkerIds.length - 1];
          creditLine = `בדיגיטל: ${allButLast} ו${last}.`;
        }
      }
      
      console.log(`Generated fallback credit line using IDs: ${creditLine}`);
      return creditLine;
    }
    
  } catch (error) {
    console.error('Error fetching digital workers:', error);
    return null;
  }
};
