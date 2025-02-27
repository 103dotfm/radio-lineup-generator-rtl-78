
import { supabase } from "@/integrations/supabase/client";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  console.log('Using start date:', startDate, 'Formatted:', format(startDate, 'yyyy-MM-dd'));

  if (isMasterSchedule) {
    console.log('Fetching master schedule slots...');
    try {
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
    } catch (err) {
      console.error('Exception in fetching master schedule:', err);
      return [];
    }
  }

  try {
    // First, get all recurring slots regardless of creation date
    const { data: recurringSlots, error: recurringError } = await supabase
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

    if (recurringError) {
      console.error('Error fetching recurring slots:', recurringError);
      throw recurringError;
    }

    console.log('Retrieved recurring slots:', recurringSlots);

    // Then, get all non-recurring slots/modifications for the current week
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(addDays(startDate, 6), 'yyyy-MM-dd');

    console.log(`Fetching slots for week: ${formattedStartDate} to ${formattedEndDate}`);

    const { data: weeklyModifications, error: weeklyError } = await supabase
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
      .eq('is_recurring', false)
      .gte('created_at', formattedStartDate)
      .lte('created_at', formattedEndDate + 'T23:59:59')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (weeklyError) {
      console.error('Error fetching weekly modifications:', weeklyError);
      throw weeklyError;
    }

    console.log('Retrieved weekly modifications:', weeklyModifications);

    // Combine the results
    const allSlots = [...(recurringSlots || []), ...(weeklyModifications || [])];
    console.log('Combined slots:', allSlots);

    // Check if we have any data
    if (!allSlots || allSlots.length === 0) {
      console.log('No slots found in the database after combining');
      return [];
    }

    const processedSlots = allSlots.reduce((acc: ScheduleSlot[], slot) => {
      if (!slot) {
        console.log('Encountered undefined slot, skipping');
        return acc;
      }
      
      const slotDate = addDays(startDate, slot.day_of_week);
      
      if (!slot.is_recurring) {
        // For non-recurring slots, we need to check if they belong to the current week
        try {
          const slotCreationDate = new Date(slot.created_at);
          const slotWeekStart = startOfWeek(slotCreationDate, { weekStartsOn: 0 });
          
          console.log(`Comparing non-recurring slot creation week: ${format(slotWeekStart, 'yyyy-MM-dd')} with current week start: ${format(startDate, 'yyyy-MM-dd')}`);
          
          // Check if this modification belongs to the current week we're viewing
          const isSameWeek = format(slotWeekStart, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');
          
          if (isSameWeek) {
            if (!slot.is_deleted) { // Only add non-deleted slots
              console.log(`Adding non-recurring slot to result: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}`);
              acc.push({
                ...slot,
                is_modified: true
              });
            } else {
              console.log(`Skipping deleted slot: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}`);
            }
          } else {
            console.log(`Skipping non-recurring slot from different week: ${slot.show_name}`);
          }
        } catch (e) {
          console.error('Error processing non-recurring slot date:', e);
        }
        return acc;
      }

      // For recurring slots, check if there's a modification in the current week
      const weekModification = weeklyModifications?.find(s => 
        s.day_of_week === slot.day_of_week && 
        s.start_time === slot.start_time &&
        isSameDay(startOfWeek(new Date(s.created_at), { weekStartsOn: 0 }), startDate)
      );

      if (weekModification) {
        console.log(`Found modification for slot: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}, deleted: ${weekModification.is_deleted}`);
        
        // If there's a modification and it's not deleted, add the modified version
        if (!weekModification.is_deleted) {
          console.log(`Adding modified slot to result: ${weekModification.show_name}`);
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

      // No modifications exist for this recurring slot, so add it
      console.log(`Adding recurring slot to result: ${slot.show_name} at ${slot.start_time} on day ${slot.day_of_week}`);
      acc.push({
        ...slot,
        is_modified: false
      });

      return acc;
    }, []);

    if (!processedSlots || processedSlots.length === 0) {
      console.log('No processed slots to display after filtering');
      return [];
    }

    console.log('Processed slots before final mapping:', processedSlots);

    const finalSlots = processedSlots.map(slot => {
      if (!slot.shows) {
        return {
          ...slot,
          shows: [],
          has_lineup: false
        };
      }

      const slotDate = addDays(startDate, slot.day_of_week);
      const formattedSlotDate = format(slotDate, 'yyyy-MM-dd');
      
      console.log(`Finding shows for date ${formattedSlotDate} for slot ${slot.show_name}`);
      
      const showsInWeek = slot.shows.filter(show => {
        if (!show || !show.date) {
          console.log('Show has no date, skipping', show);
          return false;
        }
        const showDate = new Date(show.date);
        const isValidDate = !isNaN(showDate.getTime());
        const isSameDate = isValidDate && format(showDate, 'yyyy-MM-dd') === formattedSlotDate;
        
        if (isSameDate) {
          console.log(`Found matching show for ${slot.show_name} on ${formattedSlotDate}:`, show);
        }
        
        return isSameDate;
      }) || [];

      return {
        ...slot,
        shows: showsInWeek,
        has_lineup: showsInWeek.length > 0
      };
    });

    console.log('Final processed slots:', finalSlots);
    return finalSlots;
  } catch (err) {
    console.error('Exception in getScheduleSlots:', err);
    return [];
  }
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

export const updateScheduleSlot = async (id: string, updates: Partial<ScheduleSlot>, isMasterSchedule: boolean = false): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', { id, updates, isMasterSchedule });

  // Get the original slot
  const { data: originalSlot } = await supabase
    .from('schedule_slots')
    .select('*, shows(*)')
    .eq('id', id)
    .single();

  if (!originalSlot) {
    throw new Error('Slot not found');
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

  // If this is a recurring slot being modified in weekly view
  if (originalSlot.is_recurring) {
    // For recurring slots in weekly view, mark the modification but keep the same ID
    const { data, error } = await supabase
      .from('schedule_slots')
      .update({
        ...updates,
        is_recurring: false,
        is_modified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // For non-recurring slots, just update the existing slot
  const { data, error } = await supabase
    .from('schedule_slots')
    .update({
      ...updates,
      is_recurring: false,
      is_modified: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
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
