
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time
 * Prioritizes finding the next show on the SAME day, looking at special programming first
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
    
    // Format the date to match the DB format
    const dateStr = format(currentShowDate, 'yyyy-MM-dd');
    console.log('Finding next show after date:', dateStr, 'and time:', currentShowTime);
    
    // Parse the current show time to create a full date-time
    const timeParts = currentShowTime.split(':');
    const currentHour = parseInt(timeParts[0], 10) || 0;
    const currentMinute = parseInt(timeParts[1] || '0', 10);
    
    // Create a full date-time object for the current show
    const currentDateTime = new Date(currentShowDate);
    currentDateTime.setHours(currentHour);
    currentDateTime.setMinutes(currentMinute);
    
    // Add show duration (default 60 minutes) to get the end time
    const estimatedEndTime = new Date(currentDateTime);
    estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + 60);
    
    console.log(`Current show ends at approximately: ${format(estimatedEndTime, 'HH:mm')}`);
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = currentShowDate.getDay();
    console.log(`Current day of week: ${currentDayOfWeek}`);
    
    // Format estimated end time as HH:mm for database query
    const endTimeStr = format(estimatedEndTime, 'HH:mm');
    
    // STEP 1: First and most important - check for ANY slots for THIS DAY 
    // (recurring or non-recurring) that start after our show ends
    const { data: allSlotsForToday, error: todaySlotsError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', currentDayOfWeek)
      .gt('start_time', endTimeStr)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (todaySlotsError) {
      console.error('Error fetching slots for today:', todaySlotsError);
      return null;
    }
    
    // If we found ANY slot for today, use it
    if (allSlotsForToday && allSlotsForToday.length > 0) {
      console.log('Found next show slot for today:', allSlotsForToday[0].show_name);
      return extractShowInfo(allSlotsForToday[0]);
    }
    
    // If we get here, there are no more shows scheduled for today
    console.log('No more shows found for today');
    return null;
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};

// Helper function to extract name and host from a slot
function extractShowInfo(slot: any): NextShowInfo {
  // Extract host from show name if applicable
  if (slot.host_name && slot.host_name !== slot.show_name) {
    return {
      name: slot.show_name,
      host: slot.host_name
    };
  }
  
  const hostMatch = slot.show_name.match(/(.*?)\s+עם\s+(.*)/);
  if (hostMatch) {
    return {
      name: hostMatch[1].trim(),
      host: hostMatch[2].trim()
    };
  }
  
  return {
    name: slot.show_name
  };
}
