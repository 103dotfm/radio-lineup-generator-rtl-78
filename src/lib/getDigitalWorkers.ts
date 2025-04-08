
import { supabase } from "@/lib/supabase";
import { format, parse, startOfWeek } from 'date-fns';

interface DigitalShift {
  id: string;
  person_name: string;
  section_name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
}

export async function getDigitalWorkersForShow(showDate: Date | undefined, showTime: string): Promise<string | null> {
  try {
    if (!showDate || !showTime) {
      console.log('Missing date or time for digital workers fetch');
      return null;
    }

    // Ensure showTime is in the correct format (HH:mm)
    let formattedShowTime = showTime;
    if (showTime.length === 5) { // Format is already HH:mm
      formattedShowTime = showTime;
    } else if (showTime.length === 8) { // Format is HH:mm:ss
      formattedShowTime = showTime.substring(0, 5);
    }
    
    // Parse show time properly
    const showTimeParts = formattedShowTime.split(':');
    const showHour = parseInt(showTimeParts[0], 10);
    const showMinutes = parseInt(showTimeParts[1], 10);
    
    if (isNaN(showHour) || isNaN(showMinutes)) {
      console.error(`Invalid show time format: ${showTime}, parsed as ${showHour}:${showMinutes}`);
      return null;
    }
    
    // Get day of week (0-6, where 0 is Sunday)
    const dayOfWeek = showDate.getDay();
    
    console.log(`Fetching digital workers for date: ${format(showDate, 'yyyy-MM-dd')}, day of week: ${dayOfWeek}, time: ${formattedShowTime} (${showHour}:${showMinutes})`);

    // Calculate the start of the week (Sunday) for the show date
    const weekStart = startOfWeek(showDate, { weekStartsOn: 0 });
    const formattedWeekStart = format(weekStart, 'yyyy-MM-dd');
    
    console.log(`Week starting on: ${formattedWeekStart}`);

    // Find the work arrangement for this week or the closest previous one
    const { data: arrangements, error: arrangementError } = await supabase
      .from('digital_work_arrangements')
      .select('id, week_start')
      .lte('week_start', formattedWeekStart) // Get arrangements on or before this week's start
      .order('week_start', { ascending: false })
      .limit(1);

    if (arrangementError || !arrangements || arrangements.length === 0) {
      console.error('Error fetching work arrangement:', arrangementError || 'No arrangement found');
      return null;
    }

    const arrangementId = arrangements[0].id;
    const arrangementWeekStart = arrangements[0].week_start;
    
    console.log(`Found work arrangement: ${arrangementId} for week starting ${arrangementWeekStart}`);

    // Fetch digital shifts for the arrangement
    const { data: shifts, error: shiftsError } = await supabase
      .from('digital_shifts')
      .select('id, person_name, section_name, shift_type, start_time, end_time, day_of_week')
      .eq('arrangement_id', arrangementId)
      .eq('day_of_week', dayOfWeek)
      .is('is_hidden', false)
      .not('section_name', 'eq', 'radio_north'); // Exclude radio_north

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return null;
    }

    console.log(`Found ${shifts?.length || 0} shifts for day ${dayOfWeek}`);

    if (!shifts || shifts.length === 0) {
      console.log('No shifts found for this day');
      return null;
    }

    // Filter shifts to those that contain the show time
    const matchingShifts = shifts.filter(shift => {
      if (!shift.start_time || !shift.end_time) return false;
      
      // Parse start and end time directly without using date-fns
      const startTimeParts = shift.start_time.split(':');
      const endTimeParts = shift.end_time.split(':');
      
      const startHour = parseInt(startTimeParts[0], 10);
      const startMinute = parseInt(startTimeParts[1], 10);
      const endHour = parseInt(endTimeParts[0], 10);
      const endMinute = parseInt(endTimeParts[1], 10);
      
      // For debugging
      console.log(`Checking shift: ${shift.id}, ${shift.section_name}, ${startHour}:${startMinute}-${endHour}:${endMinute} against show time ${showHour}:${showMinutes}, person_name: ${shift.person_name}`);
      
      // Check if show time is within shift time
      if (
        (showHour > startHour || (showHour === startHour && showMinutes >= startMinute)) &&
        (showHour < endHour || (showHour === endHour && showMinutes <= endMinute))
      ) {
        return true;
      }
      
      return false;
    });

    console.log(`Found ${matchingShifts.length} matching shifts for time ${formattedShowTime}`);

    if (matchingShifts.length === 0) {
      return null;
    }

    // Group shifts by section
    const digitalShifts = matchingShifts.filter(shift => shift.section_name === 'digital_shifts');
    const transcriptionShifts = matchingShifts.filter(shift => shift.section_name === 'transcription_shifts');
    const liveShifts = matchingShifts.filter(shift => shift.section_name === 'live_social_shifts');

    console.log(`Matching shifts by category - Digital: ${digitalShifts.length}, Transcription: ${transcriptionShifts.length}, Live: ${liveShifts.length}`);

    // Get unique worker IDs from each group
    const uniqueDigitalWorkerIds = [...new Set(digitalShifts.map(shift => shift.person_name))];
    const uniqueTranscriptionWorkerIds = [...new Set(transcriptionShifts.map(shift => shift.person_name))];
    const uniqueLiveWorkerIds = [...new Set(liveShifts.map(shift => shift.person_name))];

    // Combine all unique worker IDs
    const allUniqueWorkerIds = [...uniqueDigitalWorkerIds, ...uniqueTranscriptionWorkerIds, ...uniqueLiveWorkerIds];
    
    // Remove any empty IDs
    const filteredWorkerIds = allUniqueWorkerIds.filter(id => id && id.trim() !== '');
    
    console.log('Filtered worker IDs for lookup:', filteredWorkerIds);
    
    if (filteredWorkerIds.length === 0) {
      console.log('No valid worker IDs found after filtering');
      return null;
    }

    // Fetch real worker names from the workers table
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name')
      .in('id', filteredWorkerIds);

    if (workersError) {
      console.error('Error fetching worker names:', workersError);
      return null;
    }

    console.log('Fetched workers:', workers);

    // Create a mapping of worker IDs to names
    const workerNames: Record<string, string> = {};
    workers?.forEach(worker => {
      workerNames[worker.id] = worker.name;
    });

    // Get the actual names using the ID mapping
    const actualNames = filteredWorkerIds.map(id => workerNames[id] || id);
    
    // Remove any still-empty names (those not found in workers table)
    const filteredNames = actualNames.filter(name => name && name.trim() !== '');
    
    console.log('Filtered names for credits:', filteredNames);
    
    if (filteredNames.length === 0) {
      console.log('No valid names found after worker name lookup');
      return null;
    }

    // Format the credit line based on number of workers
    let creditLine;
    if (filteredNames.length === 1) {
      creditLine = `בדיגיטל: ${filteredNames[0]}.`;
    } else if (filteredNames.length === 2) {
      creditLine = `בדיגיטל: ${filteredNames[0]} ו${filteredNames[1]}.`;
    } else {
      const allButLast = filteredNames.slice(0, -1).join(', ');
      const lastPerson = filteredNames[filteredNames.length - 1];
      creditLine = `בדיגיטל: ${allButLast} ו${lastPerson}.`;
    }
    
    console.log('Generated credit line:', creditLine);
    return creditLine;
    
  } catch (error) {
    console.error('Error in getDigitalWorkersForShow:', error);
    return null;
  }
}
