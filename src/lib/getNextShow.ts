
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
    
    // Get shows directly from the shows table for this exact date
    // This is more reliable than trying to match schedule_slots
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
    
    if (!shows || shows.length === 0) {
      console.log('No next show found for date:', formattedDate);
      return null;
    }
    
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
