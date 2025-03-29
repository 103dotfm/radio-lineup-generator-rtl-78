
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show for the EXACT SAME DATE as the current show
 * Only looks at shows scheduled on the specified date
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
    
    // First check schedule_slots for all shows on this day (recurring and non-recurring)
    // Get the day of week (0-6, where 0 is Sunday)
    const dayOfWeek = currentShowDate.getDay();
    console.log('Checking schedule_slots for day of week:', dayOfWeek);
    
    // Convert current time to a comparable format (HH:MM)
    const timeForComparison = currentShowTime.substring(0, 5);
    
    // Query to get the next slot from schedule_slots regardless of whether it has a lineup
    const { data: slots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true)
      .not('is_deleted', 'eq', true)
      .gt('start_time', timeForComparison)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (slotsError) {
      console.error('Error fetching from schedule_slots:', slotsError);
      return null;
    }
    
    // Also check the shows table for any one-off shows on this exact date
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
      .limit(10); // Get multiple shows so we can compare times
    
    if (showsError) {
      console.error('Error fetching next show from shows table:', showsError);
      return null;
    }
    
    // Determine the earliest show between schedule slots and specific shows
    let nextShowInfo: NextShowInfo | null = null;
    let earliestTime = '23:59'; // Initialize with end of day
    
    // Process slots from schedule_slots
    if (slots && slots.length > 0) {
      const nextSlot = slots[0];
      console.log('Found potential next slot from schedule:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      // Format the time for comparison (ensuring it's in HH:MM format)
      const slotTime = nextSlot.start_time.substring(0, 5);
      
      if (slotTime < earliestTime) {
        earliestTime = slotTime;
        nextShowInfo = extractShowInfo(nextSlot);
        console.log('Current earliest show is from schedule_slots:', nextSlot.show_name, 'at', slotTime);
      }
    }
    
    // Process shows from shows table
    if (shows && shows.length > 0) {
      for (const show of shows) {
        // Format the time for comparison (ensuring it's in HH:MM format)
        const showTime = show.time.substring(0, 5);
        
        console.log('Comparing show from shows table:', show.name, 'at', showTime, 'with current earliest:', earliestTime);
        
        if (showTime < earliestTime) {
          earliestTime = showTime;
          
          // If the show has a slot_id, try to get additional information
          if (show.slot_id) {
            const { data: slot } = await supabase
              .from('schedule_slots')
              .select('*')
              .eq('id', show.slot_id)
              .single();
              
            if (slot) {
              console.log('Found slot details for show:', slot.show_name);
              nextShowInfo = extractShowInfo(slot);
              console.log('Updated earliest show from shows table with slot info:', slot.show_name, 'at', showTime);
              continue;
            }
          }
          
          // If no slot or slot details not available, use show name directly
          const hostMatch = show.name.match(/(.*?)\s+עם\s+(.*)/);
          if (hostMatch) {
            nextShowInfo = {
              name: hostMatch[1].trim(),
              host: hostMatch[2].trim()
            };
          } else {
            nextShowInfo = {
              name: show.name
            };
          }
          console.log('Updated earliest show from shows table:', show.name, 'at', showTime);
        }
      }
    }
    
    if (nextShowInfo) {
      console.log('Final next show:', nextShowInfo.name, nextShowInfo.host ? `with ${nextShowInfo.host}` : '', 'at', earliestTime);
      return nextShowInfo;
    }
    
    console.log('No next show found for date:', formattedDate);
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
