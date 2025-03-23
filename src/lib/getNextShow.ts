
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time
 * Directly queries the schedule_slots table to find the next slot for the exact date
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
    
    // Find slots for the EXACT date that start AFTER the estimated end time
    const { data: slotsToday, error: errorToday } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', currentDayOfWeek)
      .gt('start_time', endTimeStr)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (errorToday) {
      console.error('Error fetching today slots:', errorToday);
      return null;
    }
    
    console.log(`Found ${slotsToday?.length || 0} slots later today`);
    
    if (slotsToday && slotsToday.length > 0) {
      // Found slot for today, use it
      const nextSlot = slotsToday[0];
      console.log('Next slot today:', nextSlot.show_name, 'at', nextSlot.start_time);
      return extractShowInfo(nextSlot);
    }
    
    // If no slots found for today after the current time, get the first slot for tomorrow
    const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
    console.log(`Checking slots for tomorrow (day ${nextDayOfWeek})`);
    
    const { data: slotsTomorrow, error: errorTomorrow } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', nextDayOfWeek)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (errorTomorrow) {
      console.error('Error fetching tomorrow slots:', errorTomorrow);
      return null;
    }
    
    console.log(`Found ${slotsTomorrow?.length || 0} slots for tomorrow`);
    
    if (slotsTomorrow && slotsTomorrow.length > 0) {
      const nextSlot = slotsTomorrow[0];
      console.log('First slot tomorrow:', nextSlot.show_name, 'at', nextSlot.start_time);
      return extractShowInfo(nextSlot);
    }
    
    console.log('No next show found');
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
