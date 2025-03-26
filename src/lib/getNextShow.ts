
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
    
    // Try to fetch schedule cache from public directory
    let scheduleCache: ScheduleCache;
    
    try {
      // Fetch the schedule cache from the public directory with a cache-busting query parameter
      const response = await fetch(`/schedule-cache.json?t=${new Date().getTime()}`);
      
      if (!response.ok) {
        console.log('Schedule cache file not found or not accessible:', response.status, response.statusText);
        
        // Try the sample file as a fallback
        const sampleResponse = await fetch(`/schedule-cache-sample.json?t=${new Date().getTime()}`);
        
        if (!sampleResponse.ok) {
          console.log('Sample cache file not found either');
          
          // Fall back to database cache if file is not available
          const { data: cacheSetting, error: cacheError } = await supabase
            .from('system_settings')
            .select('value, updated_at')
            .eq('key', 'schedule_cache')
            .single();
          
          if (cacheError || !cacheSetting || !cacheSetting.value) {
            console.log('No schedule cache found in database either');
            return null;
          }
          
          console.log('Using database cache as fallback');
          scheduleCache = JSON.parse(cacheSetting.value);
        } else {
          // Parse the sample file data
          scheduleCache = await sampleResponse.json();
          console.log('Using sample schedule cache file:', scheduleCache);
        }
      } else {
        // Parse the file data
        scheduleCache = await response.json();
        console.log('Successfully loaded schedule cache from file:', scheduleCache);
      }
    } catch (e) {
      console.error('Error loading schedule cache:', e);
      return null;
    }
    
    // Check if we have data for this date
    if (!scheduleCache[formattedDate] || !scheduleCache[formattedDate].length) {
      console.log('No schedule data found for date:', formattedDate);
      return null;
    }
    
    // Find the shows for this date
    const showsForDate = scheduleCache[formattedDate];
    console.log('Shows for date:', showsForDate);
    
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
