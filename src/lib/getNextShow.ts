
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show for the specified date by looking ONLY at the daily schedule
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
    
    // Only check the shows table for any shows scheduled on this exact date
    // that come after the current show's time
    const { data: nextShows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        time,
        date
      `)
      .eq('date', formattedDate)
      .gt('time', currentShowTime)
      .order('time', { ascending: true });
    
    if (showsError) {
      console.error('Error fetching next show from shows table:', showsError);
      return null;
    }
    
    if (!nextShows || nextShows.length === 0) {
      console.log('No next show found for date:', formattedDate);
      return null;
    }
    
    // Get the immediate next show (the first one after sorting by time)
    const nextShow = nextShows[0];
    console.log('Found next show:', nextShow.name, 'at', nextShow.time);
    
    // Extract name and host if applicable
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
