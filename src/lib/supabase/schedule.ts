import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  console.log('Using start date:', startDate);

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
    .or(`is_recurring.eq.false,is_recurring.eq.true`)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;

  console.log('Retrieved all slots:', allSlots);

  const processedSlots = allSlots?.reduce((acc: ScheduleSlot[], slot) => {
    const slotDate = addDays(startDate, slot.day_of_week);
    
    if (!slot.is_recurring) {
      const slotCreationDate = startOfWeek(new Date(slot.created_at), { weekStartsOn: 0 });
      if (isSameDay(slotCreationDate, startDate)) {
        if (!slot.is_deleted) { // Only add non-deleted slots
          acc.push({
            ...slot,
            is_modified: true
          });
        }
      }
      return acc;
    }

    // Check for modifications (including deletions) in the current week
    const weekModification = allSlots.find(s => 
      !s.is_recurring && 
      s.day_of_week === slot.day_of_week && 
      s.start_time === slot.start_time &&
      isSameDay(startOfWeek(new Date(s.created_at), { weekStartsOn: 0 }), startDate)
    );

    if (weekModification) {
      // If there's a modification and it's not deleted, add the modified version
      if (!weekModification.is_deleted) {
        acc.push({
          ...weekModification,
          is_modified: true
        });
      }
      // If it's deleted, don't add anything
      return acc;
    }

    // Add the recurring slot if no modifications exist
    if (isBefore(new Date(slot.created_at), addDays(startDate, 7))) {
      acc.push({
        ...slot,
        is_modified: false
      });
    }

    return acc;
  }, []);

  const finalSlots = processedSlots.map(slot => {
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
    created_at: new Date().toISOString()
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

  const { data, error } = await supabase
    .from('schedule_slots')
    .update({
      ...updates,
      is_recurring: false,
      is_modified: true
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteScheduleSlot = async (id: string, isMasterSchedule: boolean = false): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule });

  // Get the original slot and current week start
  const { data: originalSlot } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('id', id)
    .single();

  if (!originalSlot) {
    throw new Error('Slot not found');
  }

  // If it's master schedule, perform actual deletion
  if (isMasterSchedule) {
    const { error } = await supabase
      .from('schedule_slots')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule slot:', error);
      throw error;
    }
    return;
  }

  // If it's a recurring slot in weekly view, create a "deleted" instance
  if (originalSlot.is_recurring) {
    // Create a new non-recurring slot marked as deleted for this specific week
    const { error: insertError } = await supabase
      .from('schedule_slots')
      .insert({
        day_of_week: originalSlot.day_of_week,
        start_time: originalSlot.start_time,
        end_time: originalSlot.end_time,
        show_name: originalSlot.show_name,
        host_name: originalSlot.host_name,
        is_recurring: false,
        is_modified: true,
        is_deleted: true, // Mark as deleted for this week
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating deleted slot instance:', insertError);
      throw insertError;
    }
    return;
  }

  // If it's already a non-recurring slot, just delete it
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
