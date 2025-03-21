
import { Show } from '@/types/show';
import { format, parse, addMinutes } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time
 */
export const getNextShow = async (
  currentShowDate: Date,
  currentShowTime: string,
  supabaseGetShow: (date: string) => Promise<Show[]>
): Promise<NextShowInfo | null> => {
  try {
    if (!currentShowDate || !currentShowTime) {
      return null;
    }
    
    // Format the date to match the DB format
    const dateStr = format(currentShowDate, 'yyyy-MM-dd');
    
    // Get all shows for the current date
    const shows = await supabaseGetShow(dateStr);
    
    if (!shows || shows.length === 0) {
      return null;
    }
    
    // Parse the current show time to create a full date-time
    const currentTimeParts = currentShowTime.split(':');
    const currentDateTime = new Date(currentShowDate);
    currentDateTime.setHours(parseInt(currentTimeParts[0], 10));
    currentDateTime.setMinutes(parseInt(currentTimeParts[1] || '0', 10));
    
    // Add a default duration (e.g., 60 minutes) to the current show time
    const estimatedEndTime = addMinutes(currentDateTime, 60);
    
    // Find the next show that starts after the estimated end time
    const showsWithTimes = shows
      .filter(show => show.time) // Only consider shows with time
      .map(show => {
        const timeParts = show.time!.split(':');
        const showDateTime = new Date(currentShowDate);
        showDateTime.setHours(parseInt(timeParts[0], 10));
        showDateTime.setMinutes(parseInt(timeParts[1] || '0', 10));
        
        return {
          ...show,
          dateTime: showDateTime
        };
      })
      .filter(show => {
        // Filter shows that start after the current show ends
        return show.dateTime > estimatedEndTime;
      })
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    
    if (showsWithTimes.length === 0) {
      return null;
    }
    
    // Get the next show (first in the sorted list)
    const nextShow = showsWithTimes[0];
    
    // Extract host from show name if applicable
    const nameWithHost = nextShow.name || '';
    const hostMatch = nameWithHost.match(/(.*?)\s+עם\s+(.*)/);
    
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
