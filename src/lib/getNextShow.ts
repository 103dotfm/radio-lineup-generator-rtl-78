
import { supabase } from '@/lib/supabase';
import { format, addDays, getDay } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show from the schedule for the EXACT SAME DATE as the current show
 * First checks the schedule_slots table to find the next timeslot
 */
export const getNextShow = async (
  currentShowDate: Date,
  currentShowTime: string
): Promise<NextShowInfo | null> => {
  try {
    if (!currentShowDate || !currentShowTime) {
      console.log('Current show date or time is missing');
      return null;
    }
    
    // Format the date to match the DB format (YYYY-MM-DD)
    const formattedDate = format(currentShowDate, 'yyyy-MM-dd');
    console.log('Finding next show for EXACT date:', formattedDate, 'after time:', currentShowTime);
    
    // Get the day of week (0-6) for the current date
    const dayOfWeek = getDay(currentShowDate);
    console.log('Day of week for this date:', dayOfWeek);
    
    // First check if there's a show in the shows table for this exact date and later time
    const { data: existingShows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        time,
        date
      `)
      .eq('date', formattedDate)
      .gt('time', currentShowTime)
      .order('time', { ascending: true })
      .limit(1);
    
    if (showsError) {
      console.error('Error fetching existing shows:', showsError);
    }
    
    if (existingShows && existingShows.length > 0) {
      console.log('Found existing show in shows table:', existingShows[0]);
      
      // Extract host from show name if applicable
      const hostMatch = existingShows[0].name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: existingShows[0].name
      };
    }
    
    // If no existing show is found, check the schedule_slots for this exact day
    // Need to consider both recurring slots (master schedule) and any one-off slots for this specific date
    
    // Calculate the week start for this date to properly check for non-recurring slots
    const weekStart = new Date(currentShowDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    console.log('Checking schedule_slots for day_of_week:', dayOfWeek, 'after time:', currentShowTime, 'with week start:', weekStartStr);
    
    // Query to find the next slot in the schedule for this day
    const { data: nextSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .gt('start_time', currentShowTime)
      .or(`is_recurring.eq.true,and(is_recurring.eq.false,created_at.gte.${weekStartStr},created_at.lt.${format(addDays(weekStart, 7), 'yyyy-MM-dd')})`)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (slotsError) {
      console.error('Error fetching next slots from schedule:', slotsError);
      return null;
    }
    
    if (!nextSlots || nextSlots.length === 0) {
      console.log('No next slot found in schedule for date:', formattedDate);
      return null;
    }
    
    const nextSlot = nextSlots[0];
    console.log('Found next slot in schedule:', nextSlot);
    
    return extractShowInfo(nextSlot);
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};

// Helper function to extract name and host from a slot
function extractShowInfo(slot: any): NextShowInfo {
  // Handle case where host name is available
  if (slot.host_name && slot.host_name !== slot.show_name) {
    return {
      name: slot.show_name,
      host: slot.host_name
    };
  }
  
  // Try to extract host from show name if applicable
  const hostMatch = slot.show_name.match(/(.*?)\s+עם\s+(.*)/);
  if (hostMatch) {
    return {
      name: hostMatch[1].trim(),
      host: hostMatch[2].trim()
    };
  }
  
  return {
    name: slot.show_name
  };
}
