
import { Show } from '@/types/show';
import { format, addDays, parse, isAfter } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface NextShowInfo {
  name: string;
  host?: string;
}

/**
 * Gets the next show based on current show date and time
 * Directly queries the schedule_slots table to find the next slot
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
    
    // Add a default duration (60 minutes) to get the end time
    const currentDateTime = new Date(currentShowDate);
    currentDateTime.setHours(currentHour);
    currentDateTime.setMinutes(currentMinute);
    
    // Estimated end time (current time + 60 minutes)
    const estimatedEndTime = new Date(currentDateTime);
    estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + 60);
    
    console.log(`Current show ends at approximately: ${format(estimatedEndTime, 'HH:mm')}`);
    
    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentShowDate.getDay();
    console.log(`Current day of week: ${dayOfWeek}`);
    
    // Format estimated end time as HH:mm for database query
    const endTimeStr = format(estimatedEndTime, 'HH:mm');
    
    // Query for slots on the current day that start after the estimated end time
    const { data: slotsToday, error: errorToday } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .gt('start_time', endTimeStr)
      .or(`is_recurring.eq.true,is_modified.eq.true`)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(10);
    
    if (errorToday) {
      console.error('Error fetching today slots:', errorToday);
      return null;
    }
    
    console.log(`Found ${slotsToday?.length || 0} slots later today`);
    
    if (slotsToday && slotsToday.length > 0) {
      // Found slots for today, use the first one (earliest after current show)
      const nextSlot = slotsToday[0];
      console.log('Next slot today:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      // Extract host from show name if applicable
      if (nextSlot.host_name && nextSlot.host_name !== nextSlot.show_name) {
        return {
          name: nextSlot.show_name,
          host: nextSlot.host_name
        };
      }
      
      const hostMatch = nextSlot.show_name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: nextSlot.show_name
      };
    }
    
    // If no slots for today, check tomorrow (next day's morning slots)
    const tomorrowDayOfWeek = (dayOfWeek + 1) % 7;
    console.log(`Checking slots for tomorrow (day ${tomorrowDayOfWeek})`);
    
    const { data: slotsTomorrow, error: errorTomorrow } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', tomorrowDayOfWeek)
      .or(`is_recurring.eq.true,is_modified.eq.true`)
      .not('is_deleted', 'eq', true)
      .order('start_time', { ascending: true })
      .limit(1);
    
    if (errorTomorrow) {
      console.error('Error fetching tomorrow slots:', errorTomorrow);
      return null;
    }
    
    console.log(`Found ${slotsTomorrow?.length || 0} slots for tomorrow`);
    
    if (slotsTomorrow && slotsTomorrow.length > 0) {
      // First slot of tomorrow
      const nextSlot = slotsTomorrow[0];
      console.log('First slot tomorrow:', nextSlot.show_name, 'at', nextSlot.start_time);
      
      // Extract host from show name if applicable
      if (nextSlot.host_name && nextSlot.host_name !== nextSlot.show_name) {
        return {
          name: nextSlot.show_name,
          host: nextSlot.host_name
        };
      }
      
      const hostMatch = nextSlot.show_name.match(/(.*?)\s+עם\s+(.*)/);
      if (hostMatch) {
        return {
          name: hostMatch[1].trim(),
          host: hostMatch[2].trim()
        };
      }
      
      return {
        name: nextSlot.show_name
      };
    }
    
    console.log('No next show found');
    return null;
  } catch (error) {
    console.error('Error getting next show:', error);
    return null;
  }
};
