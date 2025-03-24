
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show from the EXACT SAME DATE's schedule
 * Only looks at non-recurring slots (specific to that date) that start after the current show time
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
    console.log('Finding next show for EXACT date:', dateStr, 'after time:', currentShowTime);
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentShowDate.getDay();
    
    // Query ONLY for slots on this EXACT date that start AFTER the current show time
    const { data: slots, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .gt('start_time', currentShowTime)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (error) {
      console.error('Error fetching next show:', error);
      return null;
    }
    
    if (!slots || slots.length === 0) {
      console.log('No next show found in daily schedule');
      return null;
    }
    
    const nextShow = slots[0];
    console.log('Found next show:', nextShow.show_name, 'at', nextShow.start_time);
    
    return extractShowInfo(nextShow);
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
