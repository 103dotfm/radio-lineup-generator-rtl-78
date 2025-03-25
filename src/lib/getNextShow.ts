
import { supabase } from '@/lib/supabase';
import { format, parseJSON } from 'date-fns';

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
 * Uses the schedule cache for reliable and consistent data
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
    
    // Get the schedule cache from the system_settings table
    const { data: cacheSetting, error: cacheError } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'schedule_cache')
      .single();
    
    if (cacheError) {
      console.error('Error fetching schedule cache:', cacheError);
      return null;
    }
    
    if (!cacheSetting || !cacheSetting.value) {
      console.log('No schedule cache found or cache is empty');
      return null;
    }
    
    const cacheAge = new Date().getTime() - new Date(cacheSetting.updated_at).getTime();
    console.log('Cache age (minutes):', Math.floor(cacheAge / (1000 * 60)));
    
    // Parse the cache
    let scheduleCache: ScheduleCache;
    try {
      scheduleCache = JSON.parse(cacheSetting.value);
    } catch (e) {
      console.error('Error parsing schedule cache:', e);
      return null;
    }
    
    // Check if we have data for this date
    if (!scheduleCache[formattedDate] || !scheduleCache[formattedDate].length) {
      console.log('No schedule data found for date:', formattedDate);
      return null;
    }
    
    // Find the shows for this date
    const showsForDate = scheduleCache[formattedDate];
    
    // Find the current show in the list
    const currentShowIndex = showsForDate.findIndex(show => show.time === currentShowTime);
    
    if (currentShowIndex === -1) {
      console.log('Current show not found in schedule for date:', formattedDate);
      return null;
    }
    
    // Get the next show (if any)
    if (currentShowIndex < showsForDate.length - 1) {
      const nextShow = showsForDate[currentShowIndex + 1];
      console.log('Found next show in schedule:', nextShow);
      
      // Extract host from show name if applicable
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
