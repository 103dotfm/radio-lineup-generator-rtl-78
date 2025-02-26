import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isBefore, startOfDay, isSameDay } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  // Get the start and end of the selected week
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  const endDate = addDays(startDate, 6);

  if (isMasterSchedule) {
    // For master schedule, just get the recurring slots
    const { data: slots, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('is_recurring', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return slots || [];
  }

  // For weekly schedule, get both recurring and modified slots
  const { data: allSlots, error } = await supabase
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

  if (error) throw error;

  // Create a map of modified slots for the selected week
  const modifiedSlots = new Map();
  allSlots?.forEach(slot => {
    if (!slot.is_recurring) {
      const slotKey = `${slot.day_of_week}-${slot.start_time}`;
      const slotDate = addDays(startDate, slot.day_of_week);
      
      // Only include modifications for the selected week
      if (isSameDay(slotDate, addDays(startDate, slot.day_of_week))) {
        modifiedSlots.set(slotKey, slot);
      }
    }
  });

  // Get base recurring slots
  const recurringSlots = allSlots?.filter(slot => slot.is_recurring) || [];

  // Merge recurring and modified slots
  const mergedSlots = recurringSlots.map(baseSlot => {
    const slotKey = `${baseSlot.day_of_week}-${baseSlot.start_time}`;
    const modifiedSlot = modifiedSlots.get(slotKey);
    
    if (modifiedSlot) {
      // Return the modified slot for this specific week
      return {
        ...modifiedSlot,
        is_modified: true
      };
    }

    // Return the base recurring slot
    return {
      ...baseSlot,
      is_modified: false
    };
  });

  // Add any shows to the slots
  const finalSlots = mergedSlots.map(slot => {
    const showsInWeek = slot.shows?.filter(show => {
      if (!show.date) return false;
      const showDate = new Date(show.date);
      return isSameDay(showDate, addDays(startDate, slot.day_of_week));
    }) || [];

    return {
      ...slot,
      shows: showsInWeek,
      has_lineup: showsInWeek.length > 0
    };
  });

  console.log('Fetched and transformed slots:', finalSlots);
  return finalSlots;
};

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isMasterSchedule: boolean = false): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', slot);
  
  const slotData = isMasterSchedule 
    ? { ...slot, is_recurring: true, is_modified: false }
    : { ...slot, is_recurring: false, is_modified: true };

  const { data, error } = await supabase
    .from('schedule_slots')
    .insert(slotData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateScheduleSlot = async (id: string, updates: Partial<ScheduleSlot>, isMasterSchedule: boolean = false): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', { id, updates, isMasterSchedule });

  if (isMasterSchedule) {
    // Update master schedule slot
    const { data, error } = await supabase
      .from('schedule_slots')
      .update({ ...updates, is_recurring: true, is_modified: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // For weekly modifications, create a new non-recurring slot
    const { data: originalSlot } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalSlot) throw new Error('Original slot not found');

    // Create a new modified slot for this specific week
    const { data, error } = await supabase
      .from('schedule_slots')
      .insert({
        ...originalSlot,
        ...updates,
        id: undefined, // Let Supabase generate a new ID
        is_recurring: false,
        is_modified: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
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
