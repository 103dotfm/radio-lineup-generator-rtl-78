import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isBefore, startOfDay, isSameDay } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
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
    // For master schedule, return the base slots without modifications
    if (isMasterSchedule) {
      return {
        ...slot,
        is_modified: false,
        shows: [],
        has_lineup: false
      };
    }

    // Get shows for this specific week
    const showsInWeek = slot.shows?.filter(show => {
      if (!show.date) return false;
      const showDate = new Date(show.date);
      return isSameDay(showDate, addDays(startDate, slot.day_of_week));
    }) || [];

    // For past weeks, show the original data without modifications
    if (isBefore(endDate, today)) {
      return {
        ...slot,
        shows: showsInWeek,
        has_lineup: showsInWeek.length > 0,
        is_modified: false
      };
    }

    // For the current week's shows (non-recurring modifications)
    const showForCurrentWeek = showsInWeek[0];
    if (showForCurrentWeek) {
      return {
        ...slot,
        show_name: showForCurrentWeek.name || slot.show_name,
        shows: showsInWeek,
        has_lineup: true,
        is_modified: true
      };
    }

    // Default case: return the slot as is
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
