
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ScheduleSlot } from "@/types/schedule";

export const getDailySchedule = async (date: Date): Promise<ScheduleSlot[]> => {
  console.log('Fetching daily schedule for date:', format(date, 'yyyy-MM-dd'));
  
  try {
    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();
    
    const { data: slots, error } = await supabase
      .from('schedule_slots_old')
      .select(`
        *,
        shows:shows_backup!slot_id (
          id,
          name,
          time,
          date,
          notes
        )
      `)
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching daily schedule:', error);
      throw error;
    }

    // Check for specific date overrides or recurring status
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Process slots and check if they apply to this specific date
    const processedSlots = slots.map(slot => {
      // Check if there's a show for this date
      const showForDate = slot.shows?.find(show => 
        show.date && format(new Date(show.date), 'yyyy-MM-dd') === formattedDate
      );
      
      return {
        ...slot,
        has_lineup: Boolean(showForDate),
        shows: showForDate ? [showForDate] : []
      };
    });

    console.log(`Retrieved ${processedSlots.length} slots for day of week ${dayOfWeek}`);
    return processedSlots;
  } catch (error) {
    console.error('Error in getDailySchedule:', error);
    throw error;
  }
};
