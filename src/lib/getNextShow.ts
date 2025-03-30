import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show for the specified date by looking at both the daily schedule and existing lineups
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
    console.log('Day of week:', dayOfWeek);
    
    // First, query the shows table for all shows with lineups on this specific date
    const { data: showsOnDate, error: showsError } = await supabase
      .from('shows')
      .select('id, name, time, date')
      .eq('date', formattedDate)
      .order('time', { ascending: true });
    
    if (showsError) {
      console.error('Error fetching shows for date:', showsError);
      return null;
    }
    
    // Then, query the schedule_slots table for all slots on this day of week
    const { data: scheduledSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('id, show_name, host_name, start_time')
      .eq('day_of_week', dayOfWeek)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });
    
    if (slotsError) {
      console.error('Error fetching schedule slots:', slotsError);
      return null;
    }
    
    // Combine and normalize the data from both sources
    const allShows = [
      // From shows table
      ...(showsOnDate || []).map(show => ({
        id: show.id,
        name: show.name,
        time: show.time,
        host: undefined
      })),
      
      // From schedule_slots table
      ...(scheduledSlots || []).map(slot => ({
        id: slot.id,
        name: slot.show_name,
        time: slot.start_time.substring(0, 8), // Convert HH:MM:SS format
        host: slot.host_name
      }))
    ];
    
    // Sort by time and remove duplicates (prefer lineups over schedule entries)
    const uniqueShows = [];
    const timeMap = new Map();
    
    // First add shows from lineups (higher priority)
    showsOnDate?.forEach(show => {
      timeMap.set(show.time, {
        id: show.id,
        name: show.name,
        time: show.time,
        host: undefined
      });
    });
    
    // Then add schedule slots if no lineup exists for that time
    scheduledSlots?.forEach(slot => {
      const timeKey = slot.start_time.substring(0, 8);
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, {
          id: slot.id,
          name: slot.show_name,
          time: timeKey,
          host: slot.host_name
        });
      }
    });
    
    // Convert map to array and sort by time
    const combinedShows = Array.from(timeMap.values()).sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });
    
    console.log('All combined shows for today:', combinedShows);
    
    // Find the first show that comes after the current show time
    const nextShow = combinedShows.find(show => show.time > currentShowTime);
    
    if (!nextShow) {
      console.log('No next show found after time:', currentShowTime);
      return null;
    }
    
    console.log('Found next show:', nextShow.name, 'at', nextShow.time);
    
    // If we have host information from the schedule slot
    if (nextShow.host) {
      return {
        name: nextShow.name,
        host: nextShow.host
      };
    }
    
    // Otherwise check if the show name contains host information
    const hostMatch = nextShow.name.match(/(.*?)\s+עם\s+(.*)/);
    if (hostMatch) {
      return {
        name: hostMatch[1].trim(),
        host: hostMatch[2].trim()
      };
    }
    
    return {
      name: nextShow.name
    };
    
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};
