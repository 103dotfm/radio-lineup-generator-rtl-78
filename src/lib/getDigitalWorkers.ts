
import { supabase } from "@/lib/supabase";
import { format, parse, startOfWeek } from 'date-fns';

interface DigitalShift {
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

    // Convert show time to Date object for comparison
    const parsedShowTime = parse(showTime, 'HH:mm', new Date());
    const showHour = parsedShowTime.getHours();
    const showMinutes = parsedShowTime.getMinutes();
    
    // Get day of week (0-6, where 0 is Sunday)
    const dayOfWeek = showDate.getDay();
    
    console.log(`Fetching digital workers for date: ${format(showDate, 'yyyy-MM-dd')}, day of week: ${dayOfWeek}, time: ${showTime}`);

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
      .select('person_name, section_name, shift_type, start_time, end_time, day_of_week')
      .eq('arrangement_id', arrangementId)
      .eq('day_of_week', dayOfWeek)
      .is('is_hidden', false);

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return null;
    }

    console.log(`Found ${shifts?.length || 0} shifts for day ${dayOfWeek}`);

    if (!shifts || shifts.length === 0) {
      console.log('No shifts found for this day');
      
      // If no shifts found for the specific day, try to get all shifts for this arrangement
      // to see if there's any data at all (for debugging purposes)
      const { data: allShifts } = await supabase
        .from('digital_shifts')
        .select('day_of_week, count(*)')
        .eq('arrangement_id', arrangementId)
        .is('is_hidden', false)
        .group('day_of_week');
        
      if (allShifts && allShifts.length > 0) {
        console.log('Available shifts by day:', allShifts);
      } else {
        console.log('No shifts found in this arrangement at all');
      }
      
      return null;
    }

    // Filter shifts to those that contain the show time
    const matchingShifts = shifts.filter(shift => {
      if (!shift.start_time || !shift.end_time) return false;
      
      const startTime = parse(shift.start_time, 'HH:mm:ss', new Date());
      const endTime = parse(shift.end_time, 'HH:mm:ss', new Date());
      
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();
      
      // For debugging
      console.log(`Checking shift: ${shift.person_name}, ${shift.section_name}, ${startHour}:${startMinute}-${endHour}:${endMinute} against show time ${showHour}:${showMinutes}`);
      
      // Check if show time is within shift time
      if (
        (showHour > startHour || (showHour === startHour && showMinutes >= startMinute)) &&
        (showHour < endHour || (showHour === endHour && showMinutes <= endMinute))
      ) {
        return true;
      }
      
      return false;
    });

    console.log(`Found ${matchingShifts.length} matching shifts for time ${showTime}`);

    if (matchingShifts.length === 0) {
      return null;
    }

    // Group shifts by section
    const digitalShifts = matchingShifts.filter(shift => shift.section_name === 'משמרות דיגיטל');
    const transcriptionShifts = matchingShifts.filter(shift => shift.section_name === 'משמרות תמלולים');
    const liveShifts = matchingShifts.filter(shift => shift.section_name === 'משמרות לייבים');

    console.log(`Matching shifts by category - Digital: ${digitalShifts.length}, Transcription: ${transcriptionShifts.length}, Live: ${liveShifts.length}`);

    // Remove duplicates from each group
    const uniqueDigitalNames = [...new Set(digitalShifts.map(shift => shift.person_name))];
    const uniqueTranscriptionNames = [...new Set(transcriptionShifts.map(shift => shift.person_name))];
    const uniqueLiveNames = [...new Set(liveShifts.map(shift => shift.person_name))];

    // Combine all unique names
    const allUniqueNames = [...uniqueDigitalNames, ...uniqueTranscriptionNames, ...uniqueLiveNames];
    
    // Remove any empty names
    const filteredNames = allUniqueNames.filter(name => name && name.trim() !== '');
    
    console.log('Filtered names for credits:', filteredNames);
    
    if (filteredNames.length === 0) {
      console.log('No valid names found after filtering');
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
