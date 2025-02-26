import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...');
  
  // Get the start and end of the selected week
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  const endDate = addDays(startDate, 6);

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
    // Filter shows to only include those within the selected week
    const relevantShows = slot.shows?.filter(show => {
      if (!show.date) return false;
      const showDate = new Date(show.date);
      return showDate >= startDate && showDate <= endDate;
    }) || [];

    // For non-recurring slots, only show lineup status if there's a show in the current week
    const hasLineupThisWeek = slot.is_recurring 
      ? slot.has_lineup 
      : (relevantShows.length > 0);

    return {
      id: slot.id,
      show_name: slot.show_name,
      host_name: slot.host_name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      day_of_week: slot.day_of_week,
      is_recurring: slot.is_recurring,
      is_prerecorded: slot.is_prerecorded,
      is_collection: slot.is_collection,
      has_lineup: hasLineupThisWeek,
      is_modified: slot.is_modified,
      created_at: slot.created_at,
      updated_at: slot.updated_at,
      shows: relevantShows
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
