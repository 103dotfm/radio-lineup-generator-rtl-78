
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { safeTableQuery } from './supabase-utils';

interface NextShowInfo {
  name: string;
  host?: string;
}

interface ShowRecord {
  id: string;
  name: string;
  time: string;
  date: string;
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
    const { data: showsOnDate, error: showsError } = await safeTableQuery('shows_backup')
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
    
    // Ensure we have valid data with the required properties before proceeding
    if (!Array.isArray(showsOnDate)) {
      console.error('Invalid show data structure (not an array):', showsOnDate);
      return null;
    }
    
    // Safely filter and cast data to the correct type
    const typedShows: ShowRecord[] = [];
    
    for (const show of showsOnDate) {
      if (show && 
          typeof show === 'object' && 
          'id' in show && 
          'name' in show && 
          'time' in show && 
          'date' in show &&
          typeof show.id === 'string' &&
          typeof show.name === 'string' &&
          typeof show.time === 'string' &&
          typeof show.date === 'string') {
            typedShows.push({
              id: show.id,
              name: show.name, 
              time: show.time,
              date: show.date
            });
      }
    }
    
    if (typedShows.length === 0) {
      console.error('No valid show data after filtering:', showsOnDate);
      return null;
    }
    
    const nextShow = typedShows.find(show => show.time > currentShowTime);
    
    if (!nextShow) {
      console.log('No next show found after time:', currentShowTime);
      return null;
    }
    
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
