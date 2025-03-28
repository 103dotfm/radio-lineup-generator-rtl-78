
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface NextShowInfo {
  name: string;
  host?: string;
}

type ScheduleCache = {
  [date: string]: Array<{
    name: string;
    time: string;
    host?: string;
  }>;
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
    
    // Try to fetch schedule cache from public directory with a cache-busting query parameter
    let scheduleCache: ScheduleCache | null = null;
    
    try {
      // First try: Fetch from public file with cache busting
      const response = await fetch(`/schedule-cache.json?t=${new Date().getTime()}`);
      
      if (response.ok) {
        scheduleCache = await response.json();
        console.log('Successfully loaded schedule cache from file:', Object.keys(scheduleCache));
        
        // Validate the schedule data
        if (!scheduleCache[formattedDate]) {
          console.log(`No schedule data found for date: ${formattedDate} in cache file`);
          console.log(`Available dates in cache: ${Object.keys(scheduleCache).join(', ')}`);
        } else {
          console.log(`Found ${scheduleCache[formattedDate].length} shows for date ${formattedDate} in cache file`);
        }
      } else {
        console.log('Schedule cache file not accessible:', response.status, response.statusText);
      }
    } catch (fileError) {
      console.error('Error loading schedule cache from file:', fileError);
    }
    
    // Fall back to database if file cache failed
    if (!scheduleCache || !scheduleCache[formattedDate]) {
      try {
        console.log('Falling back to database cache...');
        const { data: cacheSetting, error: cacheError } = await supabase
          .from('system_settings')
          .select('value, updated_at')
          .eq('key', 'schedule_cache')
          .single();
        
        if (cacheError || !cacheSetting || !cacheSetting.value) {
          console.log('No schedule cache found in database either');
          return null;
        }
        
        console.log('Using database cache as fallback, updated at:', cacheSetting.updated_at);
        scheduleCache = JSON.parse(cacheSetting.value);
        
        if (!scheduleCache[formattedDate]) {
          console.log(`No schedule data found for date: ${formattedDate} in database cache`);
          console.log(`Available dates in database cache: ${Object.keys(scheduleCache).join(', ')}`);
          return null;
        }
      } catch (dbError) {
        console.error('Error retrieving cache from database:', dbError);
        return null;
      }
    }
    
    // Last resort: use hardcoded data if everything else failed
    if (!scheduleCache || !scheduleCache[formattedDate]) {
      console.log('All cache methods failed, using hardcoded fallback data');
      scheduleCache = {
        [formattedDate]: [
          { name: "Morning Show", time: "07:00" },
          { name: "Midday Program", time: "12:00" },
          { name: "Evening News", time: "18:00" },
          { name: "Night Talk", time: "21:00" }
        ]
      };
    }
    
    // Check if we have data for this date
    if (!scheduleCache[formattedDate] || !scheduleCache[formattedDate].length) {
      console.log('No schedule data found for date:', formattedDate);
      return null;
    }
    
    // Find the shows for this date
    const showsForDate = scheduleCache[formattedDate];
    console.log('Shows for date:', showsForDate.map(s => `${s.name} at ${s.time}`).join(', '));
    
    // Find the current show in the list - match by time
    // First standardize the time format (strip seconds if present)
    const standardizedCurrentTime = currentShowTime.substring(0, 5); // Take only HH:MM part
    const currentShowIndex = showsForDate.findIndex(show => show.time.substring(0, 5) === standardizedCurrentTime);
    
    if (currentShowIndex === -1) {
      console.log('Current show not found in schedule for date:', formattedDate, 'time:', standardizedCurrentTime);
      console.log('Available shows:', showsForDate.map(s => `${s.name} at ${s.time}`).join(', '));
      return null;
    }
    
    // Get the next show (if any)
    if (currentShowIndex < showsForDate.length - 1) {
      const nextShow = showsForDate[currentShowIndex + 1];
      
      // Skip if next show is empty
      if (!nextShow.name) {
        console.log('Next show slot is empty, looking further ahead');
        // Look for the next non-empty show
        for (let i = currentShowIndex + 2; i < showsForDate.length; i++) {
          if (showsForDate[i].name) {
            console.log('Found next non-empty show:', showsForDate[i]);
            return extractShowInfo(showsForDate[i].name, showsForDate[i].host);
          }
        }
        console.log('No more shows with content found today');
        return null;
      }
      
      console.log('Found next show in schedule:', nextShow);
      return extractShowInfo(nextShow.name, nextShow.host);
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
function extractShowInfo(showName: string, host?: string): NextShowInfo {
  // If host is provided directly, use it
  if (host) {
    return {
      name: showName.trim(),
      host: host.trim()
    };
  }
  
  // Try to extract host from show name if applicable
  const hostMatch = showName.match(/(.*?)\s+עם\s+(.*)/);
  if (hostMatch) {
    return {
      name: hostMatch[1].trim(),
      host: hostMatch[2].trim()
    };
  }
  
  return {
    name: showName.trim()
  };
}
