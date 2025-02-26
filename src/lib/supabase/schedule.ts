import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";

export const getScheduleSlots = async (): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...');
  
  // First, get all schedule slots with their related shows
  const { data: slots, error } = await supabase
    .from('shows')
    .select(`
      schedule_slots!inner(
        id,
        show_name,
        host_name,
        start_time,
        end_time,
        day_of_week,
        is_recurring,
        is_prerecorded,
        is_collection,
        has_lineup,
        is_modified,
        created_at,
        updated_at
      ),
      id,
      name,
      time,
      date,
      notes,
      created_at
    `)
    .order('schedule_slots.day_of_week', { ascending: true })
    .order('schedule_slots.start_time', { ascending: true });

  if (error) {
    console.error('Error fetching schedule slots:', error);
    throw error;
  }

  // Transform the data to match the ScheduleSlot type
  const transformedSlots = slots?.map(record => {
    const slot = record.schedule_slots;
    return {
      ...slot,
      shows: [{
        id: record.id,
        name: record.name,
        time: record.time,
        date: record.date,
        notes: record.notes,
        created_at: record.created_at
      }]
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
