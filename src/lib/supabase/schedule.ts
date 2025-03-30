
import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format, parseISO } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  console.log('Using start date:', startDate);
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');

  if (isMasterSchedule) {
    console.log('Fetching master schedule slots...');
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
      .eq('is_recurring', true)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching master schedule:', error);
      throw error;
    }
    console.log('Retrieved master schedule slots:', slots);
    return slots || [];
  }

  const endDate = addDays(startDate, 6);
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');

  // For weekly view, get slots for the entire week
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
    .gte('date', formattedStartDate)
    .lte('date', formattedEndDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;

  console.log('Retrieved slots for week:', allSlots);
  
  // Process the slots to handle recurring and modified slots
  const processedSlots = allSlots?.map(slot => ({
    ...slot,
    has_lineup: slot.shows && slot.shows.length > 0
  })) || [];

  console.log('Final processed slots:', processedSlots);
  return processedSlots;
};

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule, selectedDate });
  
  // Ensure we have a date - default to today if not provided
  if (!slot.date) {
    const today = new Date();
    slot.date = format(today, 'yyyy-MM-dd');
  }
  
  // Check for existing slot at this time and date
  const { data: existingSlots } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('date', slot.date)
    .eq('start_time', slot.start_time);

  console.log('Existing slots check:', existingSlots);

  // Check for conflicts
  if (existingSlots && existingSlots.length > 0) {
    console.error('Slot conflict found for this date and time:', existingSlots);
    throw new Error('משבצת שידור כבר קיימת בזמן זה');
  }

  const slotData = {
    ...slot,
    is_recurring: isMasterSchedule,
    is_modified: !isMasterSchedule,
    color: slot.color || null
  };

  console.log('Inserting new slot with data:', slotData);

  const { data, error } = await supabase
    .from('schedule_slots')
    .insert(slotData)
    .select()
    .single();

  if (error) {
    console.error('Error creating slot:', error);
    throw error;
  }

  console.log('Successfully created slot:', data);
  return data;
};

export const updateScheduleSlot = async (id: string, updates: Partial<ScheduleSlot>, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', { id, updates, isMasterSchedule, selectedDate });

  // Get the original slot
  const { data: originalSlot, error: fetchError } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !originalSlot) {
    console.error('Error fetching original slot:', fetchError);
    throw new Error('Slot not found');
  }

  console.log('Original slot to update:', originalSlot);

  // Prepare update data
  const updateData = {
    show_name: updates.show_name || originalSlot.show_name,
    host_name: updates.host_name || originalSlot.host_name,
    start_time: updates.start_time || originalSlot.start_time,
    end_time: updates.end_time || originalSlot.end_time,
    is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
    is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
    is_recurring: originalSlot.is_recurring,
    color: updates.color || null,
    updated_at: new Date().toISOString()
  };
  
  console.log('Updating slot with data:', updateData);
  
  const { data, error } = await supabase
    .from('schedule_slots')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating slot:', error);
    throw error;
  }
  
  console.log('Successfully updated slot:', data);
  return data;
};

export const deleteScheduleSlot = async (id: string, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule, selectedDate });

  // Get the original slot
  const { data: originalSlot } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (!originalSlot) {
    throw new Error('Slot not found');
  }

  // Delete the slot
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
