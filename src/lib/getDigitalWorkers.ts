
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
      console.log(`No shifts found for day ${day}`);
      return null;
    }
    
    console.log(`Found ${shifts.length} shifts for day ${day}`);
    
    // Find shifts that match the time
    const matchingShifts = shifts.filter(shift => {
      const shiftStartTime = formatTime(shift.start_time);
      return shiftStartTime === formattedTime;
    });
    
    console.log(`Found ${matchingShifts.length} matching shifts for time ${formattedTime}`);
    
    if (matchingShifts.length === 0) {
      return null;
    }
    
    // Group by shift type
    const groupedByType: Record<string, string[]> = {};
    
    matchingShifts.forEach(shift => {
      if (!groupedByType[shift.shift_type]) {
        groupedByType[shift.shift_type] = [];
      }
      groupedByType[shift.shift_type].push(shift.person_name);
    });
    
    // Count shifts by category
    const categories = {
      "Digital": Object.keys(groupedByType).filter(type => type.includes("דיגיטל")).length,
      "Transcription": Object.keys(groupedByType).filter(type => type.includes("תמלול")).length,
      "Live": Object.keys(groupedByType).filter(type => !type.includes("דיגיטל") && !type.includes("תמלול")).length
    };
    
    console.log(`Matching shifts by category - Digital: ${categories.Digital}, Transcription: ${categories.Transcription}, Live: ${categories.Live}`);
    
    // Get all names for digital workers
    const digitalWorkerIds = matchingShifts
      .filter(shift => shift.shift_type.includes("דיגיטל"))
      .map(shift => shift.person_name);
    
    console.log(`Filtered names for credits:`, digitalWorkerIds);
    
    // Fetch actual worker names from the workers table
    let digitalWorkerNames: string[] = digitalWorkerIds;
    
    if (digitalWorkerIds.length > 0) {
      // Check if these are UUIDs or already names
      const isUUID = digitalWorkerIds[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isUUID) {
        console.log("IDs appear to be UUIDs, fetching worker names...");
        const workers = await getWorkersByIds(digitalWorkerIds);
        
        if (workers && workers.length > 0) {
          digitalWorkerNames = workers.map(worker => worker.name);
          console.log("Converted worker IDs to names:", digitalWorkerNames);
        } else {
          console.warn("Failed to fetch worker names, falling back to IDs");
        }
      } else {
        console.log("IDs appear to already be names, using directly");
      }
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
