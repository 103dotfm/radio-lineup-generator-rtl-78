import { supabase } from "@/lib/supabase";
import { DayNote, ScheduleSlot } from "@/types/schedule";
import { format, addDays } from "date-fns";

export const getScheduleSlots = async (date: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  try {
    console.log(`Fetching ${isMasterSchedule ? 'master' : 'regular'} schedule slots for date:`, format(date, 'yyyy-MM-dd'));
    
    let query;
    
    if (isMasterSchedule) {
      // For master schedule, we don't filter by date but by day of week
      query = supabase
        .from('schedule_slots_old')
        .select('*')
        .order('start_time');
    } else {
      // Calculate the week range
      const startOfWeek = date;
      const endOfWeek = addDays(startOfWeek, 6);
      
      // For regular schedule, filter by the week range
      query = supabase
        .from('schedule_slots_old')
        .select('*')
        .gte('day_of_week', 0)
        .lte('day_of_week', 6)
        .order('start_time');
    }
    
    const { data: slots, error } = await query;
    
    if (error) {
      console.error('Error fetching schedule slots:', error);
      throw error;
    }
    
    // For each slot, fetch related shows separately
    const slotsWithShows = await Promise.all(slots.map(async (slot) => {
      // Only fetch shows for non-master schedule
      if (!isMasterSchedule && slot.id) {
        const { data: shows, error: showsError } = await supabase
          .from('shows_backup')
          .select('id, name, time, date, notes, created_at')
          .eq('slot_id', slot.id);
          
        if (showsError) {
          console.error(`Error fetching shows for slot ${slot.id}:`, showsError);
          return {
            ...slot,
            shows: []
          };
        }
        
        return {
          ...slot,
          shows: shows || []
        };
      }
      
      // For master schedule or if there was an error
      return {
        ...slot,
        shows: []
      };
    }));
    
    console.log(`Retrieved ${slotsWithShows.length} schedule slots`);
    return slotsWithShows as ScheduleSlot[];
  } catch (error) {
    console.error('Error in getScheduleSlots:', error);
    throw error;
  }
};

export const getSlotById = async (slotId: string, isMasterSchedule: boolean = false): Promise<ScheduleSlot | null> => {
  try {
    console.log(`Fetching slot by ID ${slotId} (master: ${isMasterSchedule})`);
    
    const { data: slot, error } = await supabase
      .from('schedule_slots_old')
      .select('*')
      .eq('id', slotId)
      .single();
      
    if (error) {
      console.error('Error fetching slot by ID:', error);
      throw error;
    }
    
    if (!slot) {
      return null;
    }
    
    // Fetch related shows
    const { data: shows, error: showsError } = await supabase
      .from('shows_backup')
      .select('id, name, time, date, notes, created_at')
      .eq('slot_id', slot.id);
      
    if (showsError) {
      console.error(`Error fetching shows for slot ${slot.id}:`, showsError);
      return {
        ...slot,
        shows: [],
        is_modified: true
      } as ScheduleSlot;
    }
    
    return {
      ...slot,
      shows: shows || [],
      is_modified: true
    } as ScheduleSlot;
  } catch (error) {
    console.error('Error in getSlotById:', error);
    throw error;
  }
};

export const updateScheduleSlot = async (
  slotId: string,
  updates: Partial<ScheduleSlot>,
  isMasterSchedule: boolean = false,
  date?: Date
): Promise<ScheduleSlot> => {
  try {
    console.log(`Updating slot ${slotId} (master: ${isMasterSchedule})`, updates);
    
    const { data: updatedSlot, error } = await supabase
      .from('schedule_slots_old')
      .update({ ...updates, is_modified: true })
      .eq('id', slotId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating schedule slot:', error);
      throw error;
    }
    
    // Fetch related shows
    const { data: shows, error: showsError } = await supabase
      .from('shows_backup')
      .select('id, name, time, date, notes, created_at')
      .eq('slot_id', updatedSlot.id);
      
    if (showsError) {
      console.error(`Error fetching shows for slot ${updatedSlot.id}:`, showsError);
      return {
        ...updatedSlot,
        shows: [],
      } as ScheduleSlot;
    }
    
    return {
      ...updatedSlot,
      shows: shows || [],
    } as ScheduleSlot;
  } catch (error) {
    console.error('Error in updateScheduleSlot:', error);
    throw error;
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

export const getDayNotes = async (date: Date): Promise<DayNote[]> => {
  console.log('Fetching day notes for date:', format(date, 'yyyy-MM-dd'));
  
  const { data: notes, error } = await supabase
    .from('day_notes')
    .select('*')
    .eq('date', format(date, 'yyyy-MM-dd'))
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching day notes:', error);
    throw error;
  }

  console.log('Retrieved day notes:', notes);
  return notes;
};

export const createOrUpdateDayNote = async (date: Date, note: DayNote): Promise<DayNote> => {
  console.log('Creating or updating day note for date:', format(date, 'yyyy-MM-dd'), note);
  
  const { data: updatedNote, error } = await supabase
    .from('day_notes')
    .upsert(note)
    .select()
    .single();

  if (error) {
    console.error('Error creating or updating day note:', error);
    throw error;
  }

  console.log('Updated or created day note:', updatedNote);
  return updatedNote;
};
