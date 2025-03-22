
import { Show } from '@/types/show';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { supabase } from "@/lib/supabase";

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time by looking at the schedule_slots table
 */
export const getNextShow = async (
  currentShowDate: Date,
  currentShowTime: string,
  supabaseGetShow: (date: string) => Promise<Show[]>
): Promise<NextShowInfo | null> => {
  try {
    if (!currentShowDate || !currentShowTime) {
      console.log('Current show date or time is missing');
      return null;
    }
    
    // Format the date to match the DB format
    const dateStr = format(currentShowDate, 'yyyy-MM-dd');
    console.log('Finding next show for date:', dateStr, 'after time:', currentShowTime);
    
    // Calculate the day of week (0-6, where 0 is Sunday)
    const dayOfWeek = currentShowDate.getDay();
    console.log('Day of week:', dayOfWeek);
    
    // Parse the current show time to create a full date-time
    const currentTimeParts = currentShowTime.split(':');
    const currentDateTime = new Date(currentShowDate);
    currentDateTime.setHours(parseInt(currentTimeParts[0], 10) || 0);
    currentDateTime.setMinutes(parseInt(currentTimeParts[1] || '0', 10));
    
    // Add a default duration (e.g., 60 minutes) to the current show time
    const estimatedEndTime = new Date(currentDateTime);
    estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + 60);
    const endTimeString = format(estimatedEndTime, 'HH:mm:ss');
    
    console.log('Current show ends at approximately:', endTimeString);
    
    // Get the current week's start date
    const weekStart = startOfWeek(currentShowDate, { weekStartsOn: 0 });
    
    // First, try to get modified slots for the specific day
    // Look for non-recurring slots created for this specific week
    const { data: modifiedSlots, error: modifiedError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', false)
      .gt('start_time', endTimeString)
      .order('start_time', { ascending: true });
      
    if (modifiedError) {
      console.error('Error fetching modified slots:', modifiedError);
    }
    
    // Match the modified slots to the current week
    const relevantModifiedSlots = modifiedSlots?.filter(slot => {
      if (!slot.created_at) return false;
      const slotCreationWeekStart = startOfWeek(new Date(slot.created_at), { weekStartsOn: 0 });
      return isSameDay(slotCreationWeekStart, weekStart) && !slot.is_deleted;
    }) || [];
    
    console.log('Found relevant modified slots:', relevantModifiedSlots.length);
    
    // If we have modified slots for today after the current show, use the first one
    if (relevantModifiedSlots.length > 0) {
      const nextSlot = relevantModifiedSlots[0];
      console.log('Using modified slot as next show:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      // Extract host from show name if applicable
      const nameWithHost = nextSlot.show_name || '';
      const hostMatch = nextSlot.host_name ? true : nameWithHost.match(/(.*?)\s+עם\s+(.*)/);
      
      if (hostMatch && typeof hostMatch !== 'boolean') {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      } else if (nextSlot.host_name) {
        return {
          name: nextSlot.show_name,
          host: nextSlot.host_name
        };
      }
      
      return {
        name: nextSlot.show_name || 'התוכנית הבאה'
      };
    }
    
    // If no modified slots found for today, try recurring slots
    const { data: recurringSlots, error: recurringError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true)
      .gt('start_time', endTimeString)
      .order('start_time', { ascending: true });
      
    if (recurringError) {
      console.error('Error fetching recurring slots:', recurringError);
    }
    
    console.log('Found recurring slots after current show:', recurringSlots?.length || 0);
    
    // Filter out any recurring slots that are deleted for this week
    const activeRecurringSlots = recurringSlots?.filter(slot => {
      // Check if this recurring slot has a deletion marker for this week
      const hasDeletionMarker = modifiedSlots?.some(ms => 
        ms.day_of_week === slot.day_of_week &&
        ms.start_time === slot.start_time &&
        ms.is_deleted
      );
      
      return !hasDeletionMarker;
    }) || [];
    
    if (activeRecurringSlots.length > 0) {
      const nextSlot = activeRecurringSlots[0];
      console.log('Using recurring slot as next show:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      // Extract host from show name if applicable
      const nameWithHost = nextSlot.show_name || '';
      const hostMatch = nextSlot.host_name ? true : nameWithHost.match(/(.*?)\s+עם\s+(.*)/);
      
      if (hostMatch && typeof hostMatch !== 'boolean') {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      } else if (nextSlot.host_name) {
        return {
          name: nextSlot.show_name,
          host: nextSlot.host_name
        };
      }
      
      return {
        name: nextSlot.show_name || 'התוכנית הבאה'
      };
    }
    
    // No more shows for today, look at tomorrow's first slot
    const tomorrowDayOfWeek = (dayOfWeek + 1) % 7;
    
    console.log('Looking for tomorrow\'s first slot, day of week:', tomorrowDayOfWeek);
    
    // Check for modified slots for tomorrow
    const { data: tomorrowModifiedSlots, error: tomorrowModifiedError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', tomorrowDayOfWeek)
      .eq('is_recurring', false)
      .order('start_time', { ascending: true });
      
    if (tomorrowModifiedError) {
      console.error('Error fetching tomorrow\'s modified slots:', tomorrowModifiedError);
    }
    
    // Match the modified slots to the current week
    const relevantTomorrowModifiedSlots = tomorrowModifiedSlots?.filter(slot => {
      if (!slot.created_at) return false;
      const slotCreationWeekStart = startOfWeek(new Date(slot.created_at), { weekStartsOn: 0 });
      return isSameDay(slotCreationWeekStart, weekStart) && !slot.is_deleted;
    }) || [];
    
    console.log('Found relevant modified slots for tomorrow:', relevantTomorrowModifiedSlots.length);
    
    if (relevantTomorrowModifiedSlots.length > 0) {
      const nextSlot = relevantTomorrowModifiedSlots[0];
      console.log('Using tomorrow\'s modified slot as next show:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      const nameWithHost = nextSlot.show_name || '';
      const hostMatch = nextSlot.host_name ? true : nameWithHost.match(/(.*?)\s+עם\s+(.*)/);
      
      if (hostMatch && typeof hostMatch !== 'boolean') {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      } else if (nextSlot.host_name) {
        return {
          name: nextSlot.show_name,
          host: nextSlot.host_name
        };
      }
      
      return {
        name: nextSlot.show_name || 'התוכנית הבאה'
      };
    }
    
    // Check for recurring slots for tomorrow
    const { data: tomorrowRecurringSlots, error: tomorrowRecurringError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', tomorrowDayOfWeek)
      .eq('is_recurring', true)
      .order('start_time', { ascending: true });
      
    if (tomorrowRecurringError) {
      console.error('Error fetching tomorrow\'s recurring slots:', tomorrowRecurringError);
    }
    
    console.log('Found recurring slots for tomorrow:', tomorrowRecurringSlots?.length || 0);
    
    // Filter out any recurring slots that are deleted for this week
    const activeTomorrowRecurringSlots = tomorrowRecurringSlots?.filter(slot => {
      // Check if this recurring slot has a deletion marker for this week
      const hasDeletionMarker = tomorrowModifiedSlots?.some(ms => 
        ms.day_of_week === slot.day_of_week &&
        ms.start_time === slot.start_time &&
        ms.is_deleted
      );
      
      return !hasDeletionMarker;
    }) || [];
    
    if (activeTomorrowRecurringSlots.length > 0) {
      const nextSlot = activeTomorrowRecurringSlots[0];
      console.log('Using tomorrow\'s recurring slot as next show:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      const nameWithHost = nextSlot.show_name || '';
      const hostMatch = nextSlot.host_name ? true : nameWithHost.match(/(.*?)\s+עם\s+(.*)/);
      
      if (hostMatch && typeof hostMatch !== 'boolean') {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      } else if (nextSlot.host_name) {
        return {
          name: nextSlot.show_name,
          host: nextSlot.host_name
        };
      }
      
      return {
        name: nextSlot.show_name || 'התוכנית הבאה'
      };
    }
    
    console.log('No next show found');
    return null;
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};
