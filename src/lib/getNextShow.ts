import { api } from '@/lib/api-client';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show for the specified date by looking at the same day's schedule only
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
    
    // Use local date formatting to avoid timezone conversion issues
    const currentDateString = format(currentShowDate, 'yyyy-MM-dd');
    console.log('Finding next show for date:', currentDateString, 'after time:', currentShowTime);
    
    // Use the same API endpoint that the dashboard uses to get schedule for the specific date
    const { data: dailyShows, error } = await api.query('/schedule/slots', {
      selectedDate: currentDateString,
      isMasterSchedule: false
    });
    
    if (error) {
      console.error('Error fetching daily schedule:', error);
      return null;
    }
    
    if (!dailyShows || dailyShows.length === 0) {
      console.log('No shows found for the day:', currentDateString);
      return null;
    }

    console.log('All shows for the day:', dailyShows);
    
    // Find the first show that comes after the current show on the same day
    const currentShowDateTime = new Date(`${currentDateString}T${currentShowTime}`);
    
    console.log('Current show datetime:', currentShowDateTime);
    console.log('Looking for shows after:', currentShowDateTime.toISOString());
    
    // Filter shows for the current day only
    // The slot_date is in UTC, so we need to convert it to local date for comparison
    const showsForCurrentDay = dailyShows.filter(show => {
      try {
        // Parse the UTC timestamp and convert to local date
        const slotDate = new Date(show.slot_date);
        const slotDateLocal = format(slotDate, 'yyyy-MM-dd');
        const isSameDay = slotDateLocal === currentDateString;
        
        console.log(`Show: ${show.show_name}, slot_date: ${show.slot_date}, local_date: ${slotDateLocal}, isSameDay: ${isSameDay}`);
        
        return isSameDay;
      } catch (error) {
        console.error('Error parsing slot_date:', error, show);
        return false;
      }
    });
    
    console.log(`Shows for current day (${currentDateString}):`, 
      showsForCurrentDay.map(show => ({
        name: show.show_name,
        host: show.host_name,
        time: show.start_time,
        slot_date: show.slot_date
      }))
    );
    
    // Find the next show on the same day
    const nextShow = showsForCurrentDay.find(show => {
      try {
        const showDateTime = new Date(`${currentDateString}T${show.start_time}`);
        return showDateTime > currentShowDateTime;
      } catch (error) {
        console.error('Error comparing show datetime:', error, show);
        return false;
      }
    });
    
    if (!nextShow) {
      console.log('No next show found on the same day after:', currentShowDateTime);
      return null;
    }
    
    console.log('Found next show on same day:', nextShow.show_name, 'with host:', nextShow.host_name, 'at', nextShow.start_time);
    
    // Return the show name and host separately
    return {
      name: nextShow.show_name,
      host: nextShow.host_name || undefined
    };
    
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};
