import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format } from 'date-fns';

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
      // For non-recurring slots, we need to check if they belong to the current week
      const slotCreationDate = startOfWeek(new Date(slot.created_at), { weekStartsOn: 0 });
      console.log(`Comparing non-recurring slot creation date: ${format(slotCreationDate, 'yyyy-MM-dd')} with start date: ${format(startDate, 'yyyy-MM-dd')}`);
      
      // Check if this modification belongs to the current week we're viewing
      if (isSameDay(slotCreationDate, startDate)) {
        if (!slot.is_deleted) { // Only add non-deleted slots
          acc.push({
            ...slot,
            is_modified: true
          });
        } else {
          console.log(`Skipping deleted slot: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}`);
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
      console.log(`Found modification for slot: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}, deleted: ${weekModification.is_deleted}`);
      
      // If there's a modification and it's not deleted, add the modified version
      if (!weekModification.is_deleted) {
        acc.push({
          ...weekModification,
          is_modified: true
        });
      } else {
        console.log(`Skipping deleted recurring slot: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}`);
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

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule, selectedDate });
  
  const currentWeekStart = selectedDate 
    ? startOfWeek(selectedDate, { weekStartsOn: 0 })
    : startOfWeek(new Date(), { weekStartsOn: 0 });
  
  console.log('Using week start date for creation:', format(currentWeekStart, 'yyyy-MM-dd'));
  
  // Check for existing slot at this time
  const { data: existingSlots } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('day_of_week', slot.day_of_week)
    .eq('start_time', slot.start_time);

  console.log('Existing slots check:', existingSlots);

  // If we're in weekly view mode (not master schedule)
  if (!isMasterSchedule) {
    // Check if there's a deletion marker for this slot in the current week
    const deletionMarker = existingSlots?.find(s => 
      !s.is_recurring && 
      s.is_deleted && 
      isSameDay(startOfWeek(new Date(s.created_at), { weekStartsOn: 0 }), currentWeekStart)
    );
    
    // If there's a deletion marker, we can add a new slot
    if (deletionMarker) {
      console.log('Found deletion marker, allowing new slot creation');
      
      // Delete the deletion marker since we're adding a new slot
      await supabase
        .from('schedule_slots')
        .delete()
        .eq('id', deletionMarker.id);
    } else {
      // Check if there's a non-deleted existing slot for this time in this week
      const existingWeeklySlot = existingSlots?.find(s => 
        (s.is_recurring || 
         (isSameDay(startOfWeek(new Date(s.created_at), { weekStartsOn: 0 }), currentWeekStart))
        ) && 
        !s.is_deleted
      );
      
      if (existingWeeklySlot) {
        console.error('Slot conflict found for this week:', existingWeeklySlot);
        throw new Error('משבצת שידור כבר קיימת בזמן זה');
      }
    }
  } else {
    // For master schedule, just check for recurring conflicts
    const recurringConflict = existingSlots?.find(s => s.is_recurring);
    if (recurringConflict) {
      console.error('Recurring slot conflict found:', recurringConflict);
      throw new Error('משבצת שידור כבר קיימת בזמן זה');
    }
  }

  const slotData = {
    ...slot,
    is_recurring: isMasterSchedule,
    is_modified: !isMasterSchedule,
    created_at: new Date(currentWeekStart).toISOString() // Use the week start date
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

  // If this is a master schedule update (recurring slot)
  if (isMasterSchedule) {
    console.log('Directly updating recurring slot with id:', id);
    
    // Prepare update data for recurring slot
    const updateData = {
      show_name: updates.show_name || originalSlot.show_name,
      host_name: updates.host_name || originalSlot.host_name,
      start_time: updates.start_time || originalSlot.start_time,
      end_time: updates.end_time || originalSlot.end_time,
      is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
      is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
      color: updates.color || originalSlot.color,
      updated_at: new Date().toISOString()
    };
    
    console.log('Updating recurring slot with data:', updateData);
    
    const { data, error } = await supabase
      .from('schedule_slots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recurring slot:', error);
      throw error;
    }
    
    console.log('Successfully updated recurring slot:', data);
    return data;
  } 
  // Non-master schedule update (weekly view)
  else {
    console.log('Updating specific week slot');
    const currentWeekStart = selectedDate 
      ? startOfWeek(selectedDate, { weekStartsOn: 0 })
      : startOfWeek(new Date(), { weekStartsOn: 0 });
    
    console.log('Current week start for update:', format(currentWeekStart, 'yyyy-MM-dd'));
    
    // If the slot is already a non-recurring (modified) slot for this week
    if (!originalSlot.is_recurring && 
        isSameDay(startOfWeek(new Date(originalSlot.created_at), { weekStartsOn: 0 }), currentWeekStart)) {
      
      console.log('Updating existing non-recurring slot for this week');
      
      const updateData = {
        show_name: updates.show_name || originalSlot.show_name,
        host_name: updates.host_name || originalSlot.host_name,
        start_time: updates.start_time || originalSlot.start_time,
        end_time: updates.end_time || originalSlot.end_time,
        is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
        is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
        color: updates.color,
        is_modified: true,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('schedule_slots')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating non-recurring slot:', error);
        throw error;
      }
      
      console.log('Successfully updated non-recurring slot:', data);
      return data;
    } 
    // If it's a recurring slot but we're in weekly view, create a modified copy for this week
    else if (originalSlot.is_recurring) {
      console.log('Creating modified copy of recurring slot for this week');
      
      // Create a new non-recurring slot for this specific week
      const newSlotData = {
        day_of_week: originalSlot.day_of_week,
        start_time: updates.start_time || originalSlot.start_time,
        end_time: updates.end_time || originalSlot.end_time,
        show_name: updates.show_name || originalSlot.show_name,
        host_name: updates.host_name || originalSlot.host_name,
        is_recurring: false,
        is_modified: true,
        is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
        is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
        color: updates.color,
        created_at: new Date(currentWeekStart).toISOString()
      };
      
      console.log('Creating modified slot with data:', newSlotData);
      
      const { data, error } = await supabase
        .from('schedule_slots')
        .insert(newSlotData)
        .select()
        .single();

      if (error) {
        console.error('Error creating modified slot:', error);
        throw error;
      }
      
      console.log('Successfully created modified slot:', data);
      return data;
    }
    
    throw new Error('Unable to update slot');
  }
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

  // Calculate the start date of the week we're viewing
  const currentWeekStart = selectedDate 
    ? startOfWeek(selectedDate, { weekStartsOn: 0 }) 
    : startOfWeek(new Date(), { weekStartsOn: 0 });
  
  console.log('Current week start:', format(currentWeekStart, 'yyyy-MM-dd'));

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

  // If it's a recurring slot in weekly view, create a "deleted" instance for the current week
  if (originalSlot.is_recurring) {
    console.log('Creating deletion marker for recurring slot');
    
    // Check if a deletion marker for this slot already exists for this week
    const { data: existingDeletions } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('day_of_week', originalSlot.day_of_week)
      .eq('start_time', originalSlot.start_time)
      .eq('is_deleted', true)
      .eq('is_recurring', false);
      
    console.log('Existing deletion markers:', existingDeletions);
    
    // If we already have a deletion marker for a different week, we need to 
    // create a new one specifically for the current week
    const weekStartString = format(currentWeekStart, 'yyyy-MM-dd');
    
    // Create a new deletion marker with the current week's start date
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
        is_deleted: true,
        is_prerecorded: originalSlot.is_prerecorded,
        is_collection: originalSlot.is_collection,
        // Store the week start date as part of the created_at timestamp
        created_at: new Date(currentWeekStart).toISOString()
      });

    if (insertError) {
      console.error('Error creating deleted slot instance:', insertError);
      throw insertError;
    }
    console.log('Successfully created deletion marker for week starting:', weekStartString);
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
