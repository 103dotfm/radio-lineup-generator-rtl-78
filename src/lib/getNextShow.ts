
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface NextShowInfo {
  name: string;
  host?: string;
}

interface CachedShow {
  id: string;
  name: string;
  time: string;
  hasLineup: boolean;
  slotId: string | null;
}

type ScheduleCache = {
  [date: string]: CachedShow[];
};

/**
 * Gets the next show from the schedule for the EXACT SAME DATE as the current show
 * Uses the schedule cache file for reliable and consistent data
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
    
    // Format the date to match the cache format (YYYY-MM-DD)
    const formattedDate = format(currentShowDate, 'yyyy-MM-dd');
    console.log('Finding next show for EXACT date:', formattedDate, 'after time:', currentShowTime);
    
    // Try to fetch schedule cache from various sources
    let scheduleCache: ScheduleCache;
    let cacheSource = 'unknown';
    
    try {
      // First attempt: Use fetch with a cache buster to avoid browser caching
      const timestamp = new Date().getTime();
      const localUrl = `/schedule-cache.json?t=${timestamp}`;
      console.log('Attempting to fetch from local URL:', localUrl);
      
      const localResponse = await fetch(localUrl);
      
      if (localResponse.ok) {
        scheduleCache = await localResponse.json();
        cacheSource = 'local file';
        console.log('Successfully loaded schedule cache from local file');
      } else {
        console.log('Local cache file not accessible, status:', localResponse.status);
        throw new Error('Local cache not available');
      }
    } catch (localError) {
      console.error('Error fetching from local cache:', localError);
      
      try {
        // Fallback: Query database directly
        console.log('Falling back to database lookup');
        
        // Get shows from this date that start after the current show
        const { data: shows, error } = await supabase
          .from('shows')
          .select('id, name, time')
          .eq('date', formattedDate)
          .gt('time', currentShowTime)
          .order('time', { ascending: true })
          .limit(1);
        
        if (error) {
          console.error('Error fetching shows from database:', error);
          return null;
        }
        
        if (shows && shows.length > 0) {
          const nextShow = shows[0];
          console.log('Found next show from database:', nextShow);
          
          return extractShowInfo(nextShow.name);
        }
        
        console.log('No next show found in database');
        return null;
      } catch (dbError) {
        console.error('All cache sources failed:', dbError);
        return null;
      }
    }
    
    console.log(`Using cache source: ${cacheSource}`);
    
    // Check if we have data for this date
    if (!scheduleCache[formattedDate] || !scheduleCache[formattedDate].length) {
      console.log('No schedule data found for date:', formattedDate);
      return null;
    }
    
    // Find the shows for this date
    const showsForDate = scheduleCache[formattedDate];
    console.log(`Found ${showsForDate.length} shows for date:`, formattedDate);
    
    // Find the current show in the list
    const currentShowIndex = showsForDate.findIndex(show => show.time === currentShowTime);
    
    if (currentShowIndex === -1) {
      console.log('Current show not found in schedule for date:', formattedDate, 'time:', currentShowTime);
      console.log('Available shows:', showsForDate.map(s => `${s.name} at ${s.time}`).join(', '));
      return null;
    }
    
    // Get the next show (if any)
    if (currentShowIndex < showsForDate.length - 1) {
      const nextShow = showsForDate[currentShowIndex + 1];
      console.log('Found next show in schedule:', nextShow);
      
      // Extract host from show name if applicable
      return extractShowInfo(nextShow.name);
    } else {
      console.log('No next show found, this is the last show of the day');
      return null;
    }
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};

// Helper function to extract name and host from a slot
function extractShowInfo(showName: string): NextShowInfo {
  // Try to extract host from show name if applicable
  const hostMatch = showName.match(/(.*?)\s+עם\s+(.*)/);
  if (hostMatch) {
    return {
      name: hostMatch[1].trim(),
      host: hostMatch[2].trim()
    };
  }
  
  return {
    name: showName
  };
}
