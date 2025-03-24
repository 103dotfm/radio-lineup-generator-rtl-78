
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
    console.log('Finding next show for EXACT date:', dateStr, 'and after time:', currentShowTime);
    
    // For strict time comparison, convert currentShowTime to minutes since midnight
    const timeParts = currentShowTime.split(':');
    const currentHour = parseInt(timeParts[0], 10) || 0;
    const currentMinute = parseInt(timeParts[1] || '0', 10);
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Get specific date's schedule slots that start AFTER the current show time
    // This ONLY queries the slots for the exact date of the show, not any master schedule
    const { data: specificDateSlots, error: dateError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('is_recurring', false) // Only non-recurring (specific to this date)
      .not('is_deleted', 'eq', true)
      .gte('start_time', currentShowTime) // Must start after current show time
      .order('start_time', { ascending: true });
      
    if (dateError) {
      console.error('Error fetching specific date slots:', dateError);
      return null;
    }
    
    console.log(`Found ${specificDateSlots?.length || 0} specific date slots for ${dateStr} after ${currentShowTime}`);
    
    // Filter out the current show itself (if it's in the results)
    const nextSpecificDateSlots = specificDateSlots?.filter(slot => {
      // Convert slot start time to minutes for comparison
      const slotTimeParts = slot.start_time.split(':');
      const slotHour = parseInt(slotTimeParts[0], 10) || 0;
      const slotMinute = parseInt(slotTimeParts[1] || '0', 10);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      
      // Ensure it's not the same time (must be strictly after)
      return slotTimeInMinutes > currentTimeInMinutes;
    });
    
    // If we found a next specific date slot, use it
    if (nextSpecificDateSlots && nextSpecificDateSlots.length > 0) {
      console.log('Found next specific date slot:', nextSpecificDateSlots[0].show_name, 'at', nextSpecificDateSlots[0].start_time);
      return extractShowInfo(nextSpecificDateSlots[0]);
    }
    
    // No specific slot found, no next show
    console.log('No next show found in daily schedule');
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
