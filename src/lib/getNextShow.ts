
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time
 * Looks ONLY at the same day's schedule for the next chronological show
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
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = currentShowDate.getDay();
    console.log(`Current day of week: ${currentDayOfWeek}`);
    
    // Query for ALL slots for this specific day that start AFTER our show's time
    // This will include both special programming and regular slots
    const { data: nextSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', currentDayOfWeek)
      .gt('start_time', currentShowTime)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (slotsError) {
      console.error('Error fetching next slots:', slotsError);
      return null;
    }
    
    // If we found a next slot for today, use it
    if (nextSlots && nextSlots.length > 0) {
      console.log('Found next show slot:', nextSlots[0].show_name, 'at', nextSlots[0].start_time);
      return extractShowInfo(nextSlots[0]);
    }
    
    // No more shows found for today
    console.log('No next show found for today');
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
