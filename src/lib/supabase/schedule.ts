
import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  const endDate = addDays(startDate, 6);
  
  console.log('Fetching slots for week:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

  // Query all slots for the selected week
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
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }

  console.log('Retrieved slots:', slots);
  
  // Convert the date-based slots to a format compatible with our UI
  // which expects day_of_week based slots
  const processedSlots: ScheduleSlot[] = slots?.map(slot => {
    // Get day of week (0-6, where 0 is Sunday)
    const slotDate = new Date(slot.date);
    const dayOfWeek = slotDate.getDay();
    
    // Ensure shows is properly typed as an array
    const showsArray = Array.isArray(slot.shows) ? slot.shows : [];
    
    return {
      ...slot,
      day_of_week: dayOfWeek,
      is_modified: false,
      is_recurring: false,
      has_lineup: slot.shows && Array.isArray(slot.shows) && slot.shows.length > 0,
      // Ensure shows is always an array
      shows: showsArray
    };
  }) || [];

  console.log('Final processed slots:', processedSlots);
  return processedSlots;
};

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule, selectedDate });
  
  const currentWeekStart = selectedDate 
    ? startOfWeek(selectedDate, { weekStartsOn: 0 })
    : startOfWeek(new Date(), { weekStartsOn: 0 });
  
  console.log('Using week start date for creation:', format(currentWeekStart, 'yyyy-MM-dd'));
  
  // Calculate the actual date for this slot based on day_of_week
  const slotDate = addDays(currentWeekStart, slot.day_of_week);
  
  // Check for existing slot at this time and date
  const { data: existingSlots } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('date', format(slotDate, 'yyyy-MM-dd'))
    .eq('start_time', slot.start_time);

  console.log('Existing slots check:', existingSlots);
  
  if (existingSlots && existingSlots.length > 0) {
    console.error('Slot conflict found:', existingSlots);
    throw new Error('משבצת שידור כבר קיימת בזמן זה');
  }

  const slotData = {
    show_name: slot.show_name,
    host_name: slot.host_name,
    date: format(slotDate, 'yyyy-MM-dd'),
    start_time: slot.start_time,
    end_time: slot.end_time,
    is_prerecorded: slot.is_prerecorded || false,
    is_collection: slot.is_collection || false,
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
  // Add the day_of_week to the returned data for UI compatibility
  return {
    ...data,
    day_of_week: slot.day_of_week,
    is_modified: false,
    is_recurring: false,
    // Initialize shows as an empty array to ensure type compatibility
    shows: []
  };
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
  
  // Calculate day of week from the date if we need to change day
  let slotDate = new Date(originalSlot.date);
  let dayOfWeek = slotDate.getDay();
  
  if (updates.day_of_week !== undefined && updates.day_of_week !== dayOfWeek) {
    // Need to change to a different day of the week
    const currentWeekStart = selectedDate 
      ? startOfWeek(selectedDate, { weekStartsOn: 0 }) 
      : startOfWeek(new Date(), { weekStartsOn: 0 });
      
    slotDate = addDays(currentWeekStart, updates.day_of_week);
    dayOfWeek = updates.day_of_week;
  }

  const updateData = {
    show_name: updates.show_name || originalSlot.show_name,
    host_name: updates.host_name || originalSlot.host_name,
    date: format(slotDate, 'yyyy-MM-dd'),
    start_time: updates.start_time || originalSlot.start_time,
    end_time: updates.end_time || originalSlot.end_time,
    is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
    is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
    color: updates.color || originalSlot.color,
    updated_at: new Date().toISOString()
  };
  
  console.log('Updating with data:', updateData);
  
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
  
  // Return with day_of_week added for UI compatibility
  return {
    ...data,
    day_of_week: dayOfWeek,
    is_modified: false,
    is_recurring: false,
    // Initialize shows as an empty array to ensure type compatibility
    shows: []
  };
};

export const deleteScheduleSlot = async (id: string, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule, selectedDate });

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
  // This function is no longer needed with the new table structure
  return;
};
