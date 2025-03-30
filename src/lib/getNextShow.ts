
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show for the specified date prioritizing actual shows with lineups
 * over scheduled slots, and handling special programming correctly
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
    console.log('Finding next show for date:', formattedDate, 'after time:', currentShowTime);
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentShowDate.getDay();
    
    // 1. First priority: Check for actual shows with lineups for this specific date
    const { data: actualShows, error: showsError } = await supabase
      .from('shows')
      .select('id, name, time, date')
      .eq('date', formattedDate)
      .gt('time', currentShowTime)
      .order('time', { ascending: true })
      .limit(1);
    
    if (showsError) {
      console.error('Error fetching actual shows:', showsError);
    } else if (actualShows && actualShows.length > 0) {
      // We found an actual show with lineup after the current time
      console.log('Found actual show with lineup:', actualShows[0].name);
      
      // Check if the show name contains host information
      const hostMatch = actualShows[0].name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: actualShows[0].name
      };
    }
    
    // 2. Second priority: Check the schedule slots for this specific day of week
    const { data: scheduledSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('id, show_name, host_name, start_time')
      .eq('day_of_week', dayOfWeek)
      .eq('is_deleted', false)
      .gt('start_time', currentShowTime)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (slotsError) {
      console.error('Error fetching schedule slots:', slotsError);
      return null;
    } 
    
    if (scheduledSlots && scheduledSlots.length > 0) {
      console.log('Found scheduled slot:', scheduledSlots[0].show_name);
      
      // If we have host information
      if (scheduledSlots[0].host_name) {
        return {
          name: scheduledSlots[0].show_name,
          host: scheduledSlots[0].host_name
        };
      }
      
      // Check if the show name contains host information
      const hostMatch = scheduledSlots[0].show_name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: scheduledSlots[0].show_name
      };
    }
    
    // 3. No next show today, need to look at the first show of tomorrow
    // First try actual shows for tomorrow
    const tomorrow = new Date(currentShowDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = format(tomorrow, 'yyyy-MM-dd');
    const tomorrowDayOfWeek = tomorrow.getDay();
    
    // Check for actual shows tomorrow
    const { data: tomorrowShows } = await supabase
      .from('shows')
      .select('id, name, time, date')
      .eq('date', tomorrowFormatted)
      .order('time', { ascending: true })
      .limit(1);
      
    if (tomorrowShows && tomorrowShows.length > 0) {
      console.log('Found first show for tomorrow (actual):', tomorrowShows[0].name);
      
      // Check if the show name contains host information
      const hostMatch = tomorrowShows[0].name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: tomorrowShows[0].name
      };
    }
    
    // If no actual shows tomorrow, check schedule slots
    const { data: tomorrowSlots } = await supabase
      .from('schedule_slots')
      .select('id, show_name, host_name, start_time')
      .eq('day_of_week', tomorrowDayOfWeek)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true })
      .limit(1);
      
    if (tomorrowSlots && tomorrowSlots.length > 0) {
      console.log('Found first show for tomorrow (scheduled):', tomorrowSlots[0].show_name);
      
      // If we have host information
      if (tomorrowSlots[0].host_name) {
        return {
          name: tomorrowSlots[0].show_name,
          host: tomorrowSlots[0].host_name
        };
      }
      
      // Check if the show name contains host information
      const hostMatch = tomorrowSlots[0].show_name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: tomorrowSlots[0].show_name
      };
    }
    
    console.log('No next show found for today or tomorrow');
    return null;
    
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};
