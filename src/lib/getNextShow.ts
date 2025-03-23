import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time
 * Prioritizes special programming (non-recurring slots) over master schedule entries
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
    
    // Step 1: First check if there are any NON-RECURRING (special programming) slots for today
    // that start after our show ends
    const { data: specialSlots, error: specialError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', currentDayOfWeek)
      .eq('is_recurring', false)
      .gt('start_time', endTimeStr)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (specialError) {
      console.error('Error fetching special programming slots:', specialError);
      return null;
    }
    
    // If we found a special programming slot (non-recurring), use it
    if (specialSlots && specialSlots.length > 0) {
      console.log('Found special programming slot:', specialSlots[0].show_name);
      return extractShowInfo(specialSlots[0]);
    }
    
    // Step 2: If no special programming, check for recurring slots (master schedule)
    const { data: recurringSlots, error: recurringError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', currentDayOfWeek)
      .eq('is_recurring', true)
      .gt('start_time', endTimeStr)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (recurringError) {
      console.error('Error fetching recurring slots:', recurringError);
      return null;
    }
    
    // If we found a recurring slot (master schedule), check if it's not overridden
    if (recurringSlots && recurringSlots.length > 0) {
      const recurringSlot = recurringSlots[0];
      
      // Check for a deletion marker for this slot on this specific day
      const { data: deletionMarkers } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('day_of_week', currentDayOfWeek)
        .eq('start_time', recurringSlot.start_time)
        .eq('is_recurring', false)
        .eq('is_deleted', true);
      
      // If there's a deletion marker, this slot is not available today
      if (deletionMarkers && deletionMarkers.length > 0) {
        console.log('Recurring slot is deleted for today:', recurringSlot.show_name);
      } else {
        // Check for a modified version of this slot for today
        const { data: modifiedSlots } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('day_of_week', currentDayOfWeek)
          .eq('start_time', recurringSlot.start_time)
          .eq('is_recurring', false)
          .not('is_deleted', 'eq', true);
        
        // If there's a modified version, use that instead
        if (modifiedSlots && modifiedSlots.length > 0) {
          console.log('Found modified version of recurring slot:', modifiedSlots[0].show_name);
          return extractShowInfo(modifiedSlots[0]);
        }
        
        // Otherwise use the recurring slot
        console.log('Using recurring slot:', recurringSlot.show_name);
        return extractShowInfo(recurringSlot);
      }
    }
    
    // Step 3: If no slots found for today, check the first slot for tomorrow
    // This logic is for overnight shows or the last show of the day
    const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
    console.log(`No more shows today. Checking for tomorrow (day ${nextDayOfWeek})`);
    
    // First check for special programming tomorrow
    const { data: specialTomorrow } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', nextDayOfWeek)
      .eq('is_recurring', false)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (specialTomorrow && specialTomorrow.length > 0) {
      console.log('Found special programming for tomorrow:', specialTomorrow[0].show_name);
      return extractShowInfo(specialTomorrow[0]);
    }
    
    // Then check master schedule for tomorrow
    const { data: recurringTomorrow } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', nextDayOfWeek)
      .eq('is_recurring', true)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (recurringTomorrow && recurringTomorrow.length > 0) {
      // Check for deletion markers or modified versions
      const { data: tomorrowDeletions } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('day_of_week', nextDayOfWeek)
        .eq('start_time', recurringTomorrow[0].start_time)
        .eq('is_recurring', false)
        .eq('is_deleted', true);
      
      if (tomorrowDeletions && tomorrowDeletions.length > 0) {
        console.log('First slot tomorrow is deleted');
      } else {
        // Check for modified version
        const { data: tomorrowModified } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('day_of_week', nextDayOfWeek)
          .eq('start_time', recurringTomorrow[0].start_time)
          .eq('is_recurring', false)
          .not('is_deleted', 'eq', true);
        
        if (tomorrowModified && tomorrowModified.length > 0) {
          console.log('Found modified version of first slot tomorrow:', tomorrowModified[0].show_name);
          return extractShowInfo(tomorrowModified[0]);
        }
        
        console.log('First slot tomorrow from master schedule:', recurringTomorrow[0].show_name);
        return extractShowInfo(recurringTomorrow[0]);
      }
    }
    
    console.log('No next show found for today or tomorrow');
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
