import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format, addWeeks, parseISO, isEqual } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  if (isMasterSchedule) {
    // Fetch only master slots
    console.log('Fetching master schedule slots');
    const { data: slots, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('is_master', true)
      .eq('is_deleted', false)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching master schedule:', error);
      throw error;
    }

    console.log('Retrieved master schedule slots:', slots);
    return slots || [];
  }

  // For weekly schedule, fetch slots for the selected week
  if (!selectedDate) {
    console.error('selectedDate is required for weekly schedule');
    throw new Error('selectedDate is required for weekly schedule');
  }

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  
  console.log('Fetching weekly schedule slots for date range:', {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd')
  });
  
  const { data: slots, error } = await supabase
    .from('schedule_slots')
    .select('*')
    .gte('slot_date', format(weekStart, 'yyyy-MM-dd'))
    .lte('slot_date', format(weekEnd, 'yyyy-MM-dd'))
    .eq('is_deleted', false)
    .order('slot_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching weekly schedule:', error);
    throw error;
  }

  console.log('Retrieved weekly schedule slots:', slots);
  return slots || [];
};

export const createScheduleSlot = async (
  slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule, selectedDate });

  if (!isMasterSchedule && !selectedDate) {
    throw new Error('selectedDate is required for non-master slots');
  }

  // For master schedule, use current week's start date
  const slotDate = isMasterSchedule
    ? format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    : format(selectedDate!, 'yyyy-MM-dd');

  const slotData = {
    ...slot,
    slot_date: slotDate,
    is_master: isMasterSchedule,
    is_deleted: false
  };

  console.log('Inserting slot with data:', slotData);

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

export const updateScheduleSlot = async (
  id: string,
  updates: Partial<ScheduleSlot>,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<ScheduleSlot> => {
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

  console.log('Found original slot:', originalSlot);

  if (isMasterSchedule) {
    // Update master slot and all its instances
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Update master slot
    const { data: updatedMaster, error: masterError } = await supabase
      .from('schedule_slots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (masterError) {
      console.error('Error updating master slot:', masterError);
      throw masterError;
    }

    // Update all instances
    const { error: instancesError } = await supabase
      .from('schedule_slots')
      .update(updateData)
      .eq('parent_slot_id', id);

    if (instancesError) {
      console.error('Error updating slot instances:', instancesError);
      throw instancesError;
    }

    return updatedMaster;
  } else {
    // Update single instance
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

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

    return data;
  }
};

export const deleteScheduleSlot = async (
  id: string,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule, selectedDate });

  if (isMasterSchedule) {
    // Soft delete master slot and all its instances
    const { error: masterError } = await supabase
      .from('schedule_slots')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (masterError) {
      console.error('Error deleting master slot:', masterError);
      throw masterError;
    }

    const { error: instancesError } = await supabase
      .from('schedule_slots')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('parent_slot_id', id);

    if (instancesError) {
      console.error('Error deleting slot instances:', instancesError);
      throw instancesError;
    }
  } else {
    // Soft delete single instance
    const { error } = await supabase
      .from('schedule_slots')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting slot:', error);
      throw error;
    }
  }
};

export const addMissingColumns = async () => {
  const { error } = await supabase.rpc('add_schedule_slots_columns');
  if (error) {
    console.error('Error adding missing columns:', error);
    throw error;
  }
};

export const createRecurringSlotsFromMaster = async (
  slotId: string,
  dateRange: { startDate: string; endDate: string }
): Promise<{ success: boolean; error?: any }> => {
  try {
    // First get the master slot to be used as a template
    const { data: masterSlot, error: masterError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (masterError) {
      console.error('Error fetching master slot:', masterError);
      return { success: false, error: masterError };
    }

    // Generate dates for the recurring slots
    const dateList = generateDateList(
      dateRange.startDate,
      dateRange.endDate,
      masterSlot.day_of_week
    );

    // Create the slot for each date
    for (const date of dateList) {
      // Directly define the object properties to avoid complex type instantiation
      const newSlotData = {
        show_name: masterSlot.show_name,
        host_name: masterSlot.host_name,
        start_time: masterSlot.start_time,
        end_time: masterSlot.end_time,
        day_of_week: masterSlot.day_of_week,
        color: masterSlot.color,
        is_prerecorded: masterSlot.is_prerecorded,
        is_collection: masterSlot.is_collection,
        slot_date: date,
        parent_slot_id: slotId
      };

      const { error: insertError } = await supabase
        .from('schedule_slots')
        .insert(newSlotData);

      if (insertError) {
        console.error(`Error creating slot for date ${date}:`, insertError);
        return { success: false, error: insertError };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createRecurringSlotsFromMaster:', error);
    return { success: false, error };
  }
};

// Helper function to generate dates
const generateDateList = (
  startDate: string,
  endDate: string,
  dayOfWeek: number
): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];

  let current = new Date(start);
  while (current <= end) {
    if (current.getDay() === dayOfWeek) {
      dates.push(format(current, 'yyyy-MM-dd'));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export const checkSlotConflicts = async (
  slotDate: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeSlotId?: string
): Promise<{ hasConflict: boolean; conflictingSlot?: ScheduleSlot }> => {
  try {
    const { data: slots, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('slot_date', slotDate)
      .eq('day_of_week', dayOfWeek)
      .eq('is_deleted', false)
      .neq('id', excludeSlotId || '');

    if (error) {
      console.error('Error checking slot conflicts:', error);
      throw error;
    }

    // Check for time overlaps
    const conflictingSlot = slots?.find(slot => {
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;
      return (
        (startTime >= slotStart && startTime < slotEnd) ||
        (endTime > slotStart && endTime <= slotEnd) ||
        (startTime <= slotStart && endTime >= slotEnd)
      );
    });

    return {
      hasConflict: !!conflictingSlot,
      conflictingSlot
    };
  } catch (error) {
    console.error('Error in checkSlotConflicts:', error);
    throw error;
  }
};
