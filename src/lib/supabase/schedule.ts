
import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isBefore, startOfDay, isSameDay } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...');
  
  // Get the start and end of the selected week
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  const endDate = addDays(startDate, 6);
  const today = startOfDay(new Date());

  const { data: slots, error } = await supabase
    .from('schedule_slots')
    .select(`
      *,
      shows (
        id,
        name,
        time,
        date,
        notes,
        created_at,
        slot_id
      )
    `)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching schedule slots:', error);
    throw error;
  }

  // Transform the data to ensure it matches the ScheduleSlot type
  const transformedSlots: ScheduleSlot[] = slots?.map(slot => {
    // Get shows for this specific week
    const showsInWeek = slot.shows?.filter(show => {
      if (!show.date) return false;
      const showDate = new Date(show.date);
      return showDate >= startDate && showDate <= endDate;
    }) || [];

    // If this is a past week, show original data
    if (isBefore(endDate, today)) {
      return {
        ...slot,
        is_modified: false,
        shows: showsInWeek,
        has_lineup: showsInWeek.length > 0
      };
    }

    // For non-recurring modified slots
    if (!slot.is_recurring && slot.is_modified) {
      // Find the show for this specific week
      const showForWeek = showsInWeek[0];
      if (showForWeek) {
        return {
          ...slot,
          show_name: showForWeek.name || slot.show_name,
          shows: showsInWeek,
          has_lineup: true
        };
      }
    }

    // For recurring slots with modifications
    if (slot.is_recurring && slot.is_modified && !isBefore(startDate, today)) {
      // Apply modifications only to current and future weeks
      const showForWeek = showsInWeek[0];
      if (showForWeek) {
        return {
          ...slot,
          show_name: showForWeek.name || slot.show_name,
          shows: showsInWeek,
          has_lineup: true
        };
      }
    }

    return {
      ...slot,
      shows: showsInWeek,
      has_lineup: showsInWeek.length > 0
    };
  }) || [];

  console.log('Fetched and transformed slots:', transformedSlots);
  return transformedSlots;
};

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', slot);
  const { data, error } = await supabase
    .from('schedule_slots')
    .insert(slot)
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule slot:', error);
    throw error;
  }

  return data;
};

export const updateScheduleSlot = async (id: string, updates: Partial<ScheduleSlot>): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', id, updates);
  const { data, error } = await supabase
    .from('schedule_slots')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating schedule slot:', error);
    throw error;
  }

  return data;
};

export const deleteScheduleSlot = async (id: string): Promise<void> => {
  console.log('Deleting schedule slot:', id);
  const { error } = await supabase
    .from('schedule_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting schedule slot:', error);
    throw error;
  }
};

export const addMissingColumns = async () => {
  const { error } = await supabase.rpc('add_schedule_slots_columns');
  if (error) {
    console.error('Error adding missing columns:', error);
    throw error;
  }
};
