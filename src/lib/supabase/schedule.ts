
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
      .from('schedule_slots_old')
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
    // Ensure the shows property is always an array
    const processedSlots: ScheduleSlot[] = slots?.map(slot => ({
      ...slot,
      shows: Array.isArray(slot.shows) ? slot.shows : []
    })) || [];
    
    return processedSlots;
  }

  const { data: allSlots, error } = await supabase
    .from('schedule_slots_old')
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

  // Ensure all slots have a valid shows array
  const processedSlots = allSlots?.reduce((acc: ScheduleSlot[], slot) => {
    // Ensure shows is always an array
    const slotWithValidShows = {
      ...slot,
      shows: Array.isArray(slot.shows) ? slot.shows : []
    };
    
    const slotDate = addDays(startDate, slot.day_of_week);
    
    if (!slotWithValidShows.is_recurring) {
      // For non-recurring slots, we need to check if they belong to the current week
      const slotCreationDate = startOfWeek(new Date(slotWithValidShows.created_at), { weekStartsOn: 0 });
      console.log(`Comparing non-recurring slot creation date: ${format(slotCreationDate, 'yyyy-MM-dd')} with start date: ${format(startDate, 'yyyy-MM-dd')}`);
      
      // Check if this modification belongs to the current week we're viewing
      if (isSameDay(slotCreationDate, startDate)) {
        if (!slotWithValidShows.is_deleted) { // Only add non-deleted slots
          acc.push({
            ...slotWithValidShows,
            is_modified: true
          });
        } else {
          console.log(`Skipping deleted slot: ${slotWithValidShows.show_name} at ${slotWithValidShows.start_time} on day ${slotWithValidShows.day_of_week}`);
        }
      }
      return acc;
    }

    // Check for modifications (including deletions) in the current week
    const weekModification = allSlots.find(s => 
      !s.is_recurring && 
      s.day_of_week === slotWithValidShows.day_of_week && 
      s.start_time === slotWithValidShows.start_time &&
      isSameDay(startOfWeek(new Date(s.created_at), { weekStartsOn: 0 }), startDate)
    );

    if (weekModification) {
      console.log(`Found modification for slot: ${slotWithValidShows.show_name} at ${slotWithValidShows.start_time} on day ${slotWithValidShows.day_of_week}, deleted: ${weekModification.is_deleted}`);
      
      // Ensure the weekModification also has a valid shows array
      const modWithValidShows = {
        ...weekModification,
        shows: Array.isArray(weekModification.shows) ? weekModification.shows : []
      };
      
      // If there's a modification and it's not deleted, add the modified version
      if (!modWithValidShows.is_deleted) {
        acc.push({
          ...modWithValidShows,
          is_modified: true
        });
      } else {
        console.log(`Skipping deleted recurring slot: ${slotWithValidShows.show_name} at ${slotWithValidShows.start_time} on day ${slotWithValidShows.day_of_week}`);
      }
      // If it's deleted, don't add anything
      return acc;
    }

    // Add the recurring slot if no modifications exist
    if (isBefore(new Date(slotWithValidShows.created_at), addDays(startDate, 7))) {
      acc.push({
        ...slotWithValidShows,
        is_modified: false
      });
    }

    return acc;
  }, []) || [];

  const finalSlots = processedSlots.map(slot => {
    const slotDate = addDays(startDate, slot.day_of_week);
    // Get shows that have a valid date matching the slot's date in this week
    const showsInWeek = slot.shows?.filter(show => {
      if (!show?.date) return false;
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
    .from('schedule_slots_old')
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
        .from('schedule_slots_old')
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
    created_at: new Date(currentWeekStart).toISOString(),
    color: slot.color || null
  };

  console.log('Inserting new slot with data:', slotData);

  const { data, error } = await supabase
    .from('schedule_slots_old')
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
    .from('schedule_slots_old')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !originalSlot) {
    console.error('Error fetching original slot:', fetchError);
    throw new Error('Slot not found');
  }

  console.log('Original slot to update:', originalSlot);

  // For master schedule - directly update the existing slot
  if (isMasterSchedule) {
    console.log('Directly updating slot with id:', id);
    
    // Prepare update data - keeping the original day_of_week to prevent conflicts
    const updateData = {
      show_name: updates.show_name || originalSlot.show_name,
      host_name: updates.host_name || originalSlot.host_name,
      day_of_week: originalSlot.day_of_week, // Don't change day_of_week
      start_time: updates.start_time || originalSlot.start_time,
      end_time: updates.end_time || originalSlot.end_time,
      is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
      is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
      is_recurring: originalSlot.is_recurring, // Don't change is_recurring
      color: updates.color || null,
      updated_at: new Date().toISOString()
    };
    
    console.log('Updating master slot with data:', updateData);
    
    const { data, error } = await supabase
      .from('schedule_slots_old')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating master slot:', error);
      throw error;
    }
    
    console.log('Successfully updated master slot:', data);
    return data;
  }
  
  // For weekly view - we need to handle differently depending on whether it's a recurring slot or not
  console.log('Handling weekly view update');
  
  // Calculate the start date of the week we're viewing
  const currentWeekStart = selectedDate 
    ? startOfWeek(selectedDate, { weekStartsOn: 0 }) 
    : startOfWeek(new Date(), { weekStartsOn: 0 });
  
  console.log('Current week start:', format(currentWeekStart, 'yyyy-MM-dd'));

  if (originalSlot.is_recurring) {
    // For recurring slots in weekly view, we need to create a non-recurring copy for this week
    console.log('Creating non-recurring copy of recurring slot for this week');
    
    // Check if a non-recurring instance already exists for this slot in this week
    const { data: existingNonRecurring } = await supabase
      .from('schedule_slots_old')
      .select('*')
      .eq('day_of_week', originalSlot.day_of_week)
      .eq('start_time', originalSlot.start_time)
      .eq('is_recurring', false)
      .filter('created_at', 'gte', new Date(currentWeekStart).toISOString())
      .filter('created_at', 'lt', new Date(addDays(currentWeekStart, 7)).toISOString());
    
    console.log('Existing non-recurring instances:', existingNonRecurring);
    
    // If we found an existing non-recurring instance for this week, update it
    if (existingNonRecurring && existingNonRecurring.length > 0) {
      console.log('Updating existing non-recurring instance for this week');
      
      const updateData = {
        show_name: updates.show_name || originalSlot.show_name,
        host_name: updates.host_name || originalSlot.host_name,
        day_of_week: originalSlot.day_of_week, // Don't change day_of_week
        start_time: updates.start_time || originalSlot.start_time,
        end_time: updates.end_time || originalSlot.end_time,
        is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
        is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
        color: updates.color || null,
        is_modified: true,
        has_lineup: originalSlot.has_lineup, // Preserve the has_lineup flag
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('schedule_slots_old')
        .update(updateData)
        .eq('id', existingNonRecurring[0].id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating non-recurring instance:', error);
        throw error;
      }
      
      console.log('Successfully updated non-recurring instance:', data);
      return data;
    }
    
    // Create a new non-recurring instance for this week, but preserve has_lineup status
    console.log('Creating new non-recurring instance for this week');
    
    const newSlotData = {
      show_name: updates.show_name || originalSlot.show_name,
      host_name: updates.host_name || originalSlot.host_name,
      day_of_week: originalSlot.day_of_week,
      start_time: updates.start_time || originalSlot.start_time,
      end_time: updates.end_time || originalSlot.end_time,
      is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
      is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
      color: updates.color || null,
      is_recurring: false,
      is_modified: true,
      has_lineup: originalSlot.has_lineup, // Preserve the has_lineup flag
      created_at: new Date(currentWeekStart).toISOString() // Use the week start date
    };
    
    const { data, error } = await supabase
      .from('schedule_slots_old')
      .insert(newSlotData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating non-recurring instance:', error);
      throw error;
    }
    
    console.log('Successfully created non-recurring instance:', data);
    
    // If the original slot had a lineup, we need to update any associated shows to point to the new slot
    if (originalSlot.has_lineup) {
      const weekStart = currentWeekStart;
      const weekEnd = addDays(weekStart, 7);
      
      // Find shows in this week that are linked to the master slot
      const { data: shows, error: showsError } = await supabase
        .from('shows')
        .select('id, slot_id, date')
        .eq('slot_id', originalSlot.id)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lt('date', weekEnd.toISOString().split('T')[0]);
        
      if (showsError) {
        console.error('Error finding shows for slot:', showsError);
      } else if (shows && shows.length > 0) {
        console.log(`Found ${shows.length} shows to update with new slot ID:`, shows);
        
        // Update each show to link to the new slot ID
        for (const show of shows) {
          const { error: updateError } = await supabase
            .from('shows')
            .update({ slot_id: data.id })
            .eq('id', show.id);
            
          if (updateError) {
            console.error(`Error updating show ${show.id} to new slot:`, updateError);
          } else {
            console.log(`Updated show ${show.id} to link to new slot ${data.id}`);
          }
        }
      }
    }
    
    return data;
  }
  
  // For already non-recurring slots, just update directly
  console.log('Updating non-recurring slot');
  
  const updateData = {
    show_name: updates.show_name || originalSlot.show_name,
    host_name: updates.host_name || originalSlot.host_name,
    day_of_week: originalSlot.day_of_week, // Don't change day_of_week
    start_time: updates.start_time || originalSlot.start_time,
    end_time: updates.end_time || originalSlot.end_time,
    is_prerecorded: updates.is_prerecorded !== undefined ? updates.is_prerecorded : originalSlot.is_prerecorded,
    is_collection: updates.is_collection !== undefined ? updates.is_collection : originalSlot.is_collection,
    color: updates.color || null,
    is_modified: true,
    has_lineup: originalSlot.has_lineup, // Preserve the has_lineup flag
    updated_at: new Date().toISOString()
  };
  
  console.log('Updating with data:', updateData);
  
  const { data, error } = await supabase
    .from('schedule_slots_old')
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
};

export const deleteScheduleSlot = async (id: string, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule, selectedDate });

  // Get the original slot
  const { data: originalSlot } = await supabase
    .from('schedule_slots_old')
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
      .from('schedule_slots_old')
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
      .from('schedule_slots_old')
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
      .from('schedule_slots_old')
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
    .from('schedule_slots_old')
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
