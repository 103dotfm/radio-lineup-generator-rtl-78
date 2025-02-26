import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, startOfDay } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  console.log('Using start date:', startDate);
  const currentDate = new Date();

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
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching master schedule:', error);
      throw error;
    }
    console.log('Retrieved master schedule slots:', slots);
    return slots || [];
  }

  // For weekly schedule, get both recurring and non-recurring slots
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
    .or(`is_recurring.eq.false,and(is_recurring.eq.true,created_at.lte.${startDate.toISOString()})`)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;

  // Create a map of modified slots for the selected week
  const modifiedSlots = new Map();
  allSlots?.forEach(slot => {
    if (!slot.is_recurring) {
      const slotDate = addDays(startDate, slot.day_of_week);
      if (isSameDay(slotDate, addDays(startDate, slot.day_of_week))) {
        const slotKey = `${slotDate.toISOString()}-${slot.start_time}`;
        modifiedSlots.set(slotKey, slot);
      }
    }
  });

  // Get base recurring slots that were created before or during this week
  const recurringSlots = allSlots?.filter(slot => {
    if (!slot.is_recurring) return false;
    
    // For recurring slots, only include them if they were created before or during this week
    const slotDate = addDays(startDate, slot.day_of_week);
    return isAfter(slotDate, startOfDay(slot.created_at)) || isSameDay(slotDate, startOfDay(slot.created_at));
  }) || [];

  // Merge recurring and modified slots
  const mergedSlots = recurringSlots.map(baseSlot => {
    const slotDate = addDays(startDate, baseSlot.day_of_week);
    const slotKey = `${slotDate.toISOString()}-${baseSlot.start_time}`;
    const modifiedSlot = modifiedSlots.get(slotKey);
    
    if (modifiedSlot) {
      return {
        ...modifiedSlot,
        is_modified: true
      };
    }

    return {
      ...baseSlot,
      is_modified: false
    };
  });

  // Add any shows to the slots
  const finalSlots = mergedSlots.map(slot => {
    const slotDate = addDays(startDate, slot.day_of_week);
    const showsInWeek = slot.shows?.filter(show => {
      if (!show.date) return false;
      const showDate = new Date(show.date);
      return isSameDay(showDate, slotDate);
    }) || [];

    return {
      ...slot,
      shows: showsInWeek,
      has_lineup: showsInWeek.length > 0
    };
  });

  console.log('Final processed slots:', finalSlots);
  return finalSlots;
};

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isMasterSchedule: boolean = false): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule });
  
  // Check if a slot already exists at this time
  const { data: existingSlots } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('day_of_week', slot.day_of_week)
    .eq('start_time', slot.start_time)
    .eq('is_recurring', isMasterSchedule);

  console.log('Existing slots check:', existingSlots);

  if (existingSlots && existingSlots.length > 0) {
    console.error('Slot conflict found:', existingSlots);
    throw new Error('משבצת שידור כבר קיימת בזמן זה');
  }

  const slotData = {
    ...slot,
    is_recurring: isMasterSchedule,
    is_modified: !isMasterSchedule,
    created_at: new Date().toISOString() // Explicitly set creation date
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

export const updateScheduleSlot = async (id: string, updates: Partial<ScheduleSlot>, isMasterSchedule: boolean = false): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', { id, updates, isMasterSchedule });

  // If changing time, check for conflicts
  if (updates.start_time || updates.day_of_week) {
    const { data: existingSlots } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', updates.day_of_week || 0)
      .eq('start_time', updates.start_time || '')
      .eq('is_recurring', isMasterSchedule)
      .neq('id', id);

    if (existingSlots && existingSlots.length > 0) {
      throw new Error('משבצת שידור כבר קיימת בזמן זה');
    }
  }

  // For master schedule updates
  if (isMasterSchedule) {
    const { data, error } = await supabase
      .from('schedule_slots')
      .update({ ...updates, is_recurring: true, is_modified: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // For weekly schedule updates - create a new non-recurring slot
  const { data: originalSlot } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (!originalSlot) throw new Error('Original slot not found');

  // Create a new non-recurring slot for this specific instance
  const { data, error } = await supabase
    .from('schedule_slots')
    .insert({
      ...originalSlot,
      ...updates,
      id: undefined,
      is_recurring: false,
      is_modified: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
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
