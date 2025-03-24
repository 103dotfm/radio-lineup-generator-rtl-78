
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show for the EXACT SAME DATE as the current show
 * Checks both shows table and schedule_slots to find the next scheduled slot
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
    
    // Format the date to match the DB format (YYYY-MM-DD)
    const formattedDate = format(currentShowDate, 'yyyy-MM-dd');
    console.log('Finding next show for EXACT date:', formattedDate, 'after time:', currentShowTime);
    
    // First try to get next show from the shows table for this exact date
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id,
        name,
        time,
        date,
        slot_id
      `)
      .eq('date', formattedDate)
      .gt('time', currentShowTime)
      .order('time', { ascending: true })
      .limit(1);
    
    if (showsError) {
      console.error('Error fetching next show from shows table:', showsError);
      return null;
    }
    
    // If we found a next show in the shows table, use that
    if (shows && shows.length > 0) {
      const nextShow = shows[0];
      console.log('Found next show from shows table:', nextShow.name, 'at', nextShow.time);
      
      // Get slot details if available
      if (nextShow.slot_id) {
        const { data: slot } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('id', nextShow.slot_id)
          .single();
          
        if (slot) {
          console.log('Found slot details for next show:', slot.show_name);
          return extractShowInfo(slot);
        }
      }
      
      // If no slot or slot details not available, use show name directly
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
    }
    
    // If we couldn't find anything in the shows table, look for scheduled slots
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentShowDate.getDay();
    
    // Find scheduled slots for this day that start after the current time
    const { data: slots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .gt('start_time', currentShowTime)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (slotsError) {
      console.error('Error fetching next show from schedule slots:', slotsError);
      return null;
    }
    
    if (!slots || slots.length === 0) {
      console.log('No next show found for date:', formattedDate);
      return null;
    }
    
    const nextSlot = slots[0];
    console.log('Found next slot from schedule:', nextSlot.show_name, 'at', nextSlot.start_time);
    
    return extractShowInfo(nextSlot);
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
