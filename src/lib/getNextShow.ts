
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
    
    // Debug: Log the query we're about to make
    console.log(`Running query: SELECT * FROM shows_backup WHERE date = '${formattedDate}' ORDER BY time ASC`);
    
    // Query the shows table for all shows on this specific date
    const { data: showsOnDate, error: showsError } = await supabase
      .from('shows_backup')
      .select('id, name, time, date')
      .eq('date', formattedDate)
      .order('time', { ascending: true });
    
    if (showsError) {
      console.error('Error fetching shows for date:', showsError);
      return null;
    }
    
    if (!showsOnDate || showsOnDate.length === 0) {
      console.log('No shows found for date:', formattedDate);
      return null;
    }

    console.log('All shows on date:', showsOnDate);
    
    // Find the first show that comes after the current show time
    const nextShow = showsOnDate.find(show => show && show.time > currentShowTime);
    
    if (!nextShow) {
      console.log('No next show found after time:', currentShowTime);
      return null;
    }
    
    console.log('Found next show:', nextShow.name, 'at', nextShow.time);
    
    // Extract name and host if applicable
    if (nextShow && nextShow.name) {
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
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};
