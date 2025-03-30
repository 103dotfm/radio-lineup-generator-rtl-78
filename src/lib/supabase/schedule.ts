import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format, parseISO, isToday } from 'date-fns';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  if (isMasterSchedule) {
    console.log('Fetching master schedule slots...');
    // For master schedule, get all recurring slots from schedule_slots_old
    const { data: slots, error } = await supabase
      .from('schedule_slots_old')
      .select('*')
      .eq('is_recurring', true)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching master schedule:', error);
      throw error;
    }
    console.log('Retrieved master schedule slots:', slots);
    
    // Get all shows to associate with slots later
    const { data: showsData, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (showsError) {
      console.error('Error fetching shows for master slots:', showsError);
    }
    
    const shows = showsData || [];
    
    // Transform slots to match ScheduleSlot type
    const transformedSlots = slots?.map(slot => {
      // Calculate date based on day_of_week for display purposes
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      const slotDate = addDays(currentWeekStart, slot.day_of_week);
      const formattedDate = format(slotDate, 'yyyy-MM-dd');
      
      // Find shows for this slot, matching by slot_id
      const slotShows = shows.filter(show => show.slot_id === slot.id);
      
      return {
        ...slot,
        date: formattedDate,
        shows: slotShows || [],
        has_lineup: slotShows && slotShows.length > 0
      };
    }) || [];
    
    return transformedSlots;
  }

  // For weekly view, calculate the dates for the selected week
  const startDate = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 0 }) : startOfWeek(new Date(), { weekStartsOn: 0 });
  console.log('Using start date:', startDate);
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const endDate = addDays(startDate, 6);
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');

  // Get weekly shows for the date range
  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select('*')
    .gte('date', formattedStartDate)
    .lte('date', formattedEndDate)
    .order('time', { ascending: true });

  if (showsError) {
    console.error('Error fetching shows for week:', showsError);
    throw showsError;
  }
  
  console.log('Retrieved shows for week:', shows);
  
  // Now get master slots from schedule_slots_old
  const { data: masterSlots, error: masterSlotsError } = await supabase
    .from('schedule_slots_old')
    .select('*')
    .eq('is_recurring', true)
    .eq('is_deleted', false);
  
  if (masterSlotsError) {
    console.error('Error fetching master slots:', masterSlotsError);
    throw masterSlotsError;
  }
  
  // Transform master slots to weekly slots based on the selected week
  const transformedSlots: ScheduleSlot[] = [];
  
  // Keep track of slots we've already processed to avoid duplicates
  const processedSlots = new Set<string>();
  
  // Current date for determining if we should apply master schedule changes
  const currentDate = new Date();
  const tomorrow = addDays(startOfDay(currentDate), 1);  // Use tomorrow as the cutoff
  
  // For each day in the week
  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(startDate, i);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    
    // Check if this date is in the future (starting from tomorrow)
    // Only apply master schedule changes to future dates (tomorrow onwards)
    const isFutureDate = isAfter(currentDate, tomorrow) || isSameDay(currentDate, tomorrow);
    
    // Filter shows for this date (these are highest priority)
    const showsForDate = shows?.filter(show => show.date === formattedDate) || [];
    
    // Process shows with slot_id first (modifications to master schedule)
    const showsWithSlotId = showsForDate.filter(show => show.slot_id);
    
    for (const show of showsWithSlotId) {
      if (!show.slot_id) continue;
      
      // Find the master slot this show is derived from
      const masterSlot = masterSlots?.find(slot => slot.id === show.slot_id);
      if (!masterSlot) continue;
      
      const slotKey = `${formattedDate}-${masterSlot.start_time}-${masterSlot.end_time}`;
      if (processedSlots.has(slotKey)) continue;
      processedSlots.add(slotKey);
      
      transformedSlots.push({
        id: masterSlot.id,
        show_name: show.name,
        host_name: masterSlot.host_name,
        start_time: masterSlot.start_time,
        end_time: masterSlot.end_time,
        date: formattedDate,
        is_recurring: masterSlot.is_recurring,
        is_prerecorded: masterSlot.is_prerecorded,
        is_collection: masterSlot.is_collection,
        color: masterSlot.color,
        is_modified: true,
        shows: [show],
        has_lineup: true
      });
    }
    
    // Add independent shows (ones without a slot_id)
    const independentShows = showsForDate.filter(show => !show.slot_id);
    for (const show of independentShows) {
      const slotKey = `${formattedDate}-${show.time}`;
      if (processedSlots.has(slotKey)) continue;
      processedSlots.add(slotKey);
      
      transformedSlots.push({
        id: show.id,
        show_name: show.name,
        host_name: null,
        start_time: show.time || "00:00",
        end_time: show.time ? incrementTimeByHour(show.time) : "01:00",
        date: formattedDate,
        is_recurring: false,
        is_prerecorded: false,
        is_collection: false,
        shows: [show],
        has_lineup: true
      });
    }
    
    // Now add master slots for this day if they haven't been overridden,
    // but ONLY for future dates
    if (isFutureDate) {
      const daySlotsFromMaster = masterSlots?.filter(slot => slot.day_of_week === dayOfWeek) || [];
      
      for (const masterSlot of daySlotsFromMaster) {
        const slotKey = `${formattedDate}-${masterSlot.start_time}-${masterSlot.end_time}`;
        
        // Skip if we already processed this time slot
        if (processedSlots.has(slotKey)) continue;
        processedSlots.add(slotKey);
        
        // Find any shows for this master slot on this date
        const slotShows = shows?.filter(show => 
          show.date === formattedDate && 
          show.slot_id === masterSlot.id
        ) || [];
        
        transformedSlots.push({
          ...masterSlot,
          date: formattedDate,
          shows: slotShows,
          has_lineup: slotShows.length > 0
        });
      }
    }
  }
  
  // Sort all slots by date and time
  transformedSlots.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.start_time.localeCompare(b.start_time);
  });
  
  console.log('Final transformed slots:', transformedSlots);
  return transformedSlots;
};

// Helper function to increment time by 1 hour (e.g. "14:00" -> "15:00")
function incrementTimeByHour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newHours = (hours + 1) % 24;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export const createScheduleSlot = async (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule, selectedDate });
  
  if (isMasterSchedule) {
    // For master schedule, calculate day_of_week from the provided date
    const date = new Date(slot.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const slotData = {
      day_of_week: dayOfWeek,
      show_name: slot.show_name,
      host_name: slot.host_name || null,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_recurring: true,
      is_prerecorded: slot.is_prerecorded || false,
      is_collection: slot.is_collection || false,
      color: slot.color || null,
      is_deleted: false,
      is_modified: false,
      has_lineup: false
    };
    
    console.log('Inserting master slot with data:', slotData);
    
    const { data, error } = await supabase
      .from('schedule_slots_old')
      .insert(slotData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating master slot:', error);
      throw error;
    }
    
    console.log('Successfully created master slot:', data);
    // Return the data with a date for compatibility
    return {
      ...data,
      date: slot.date,
      shows: [] // Ensure shows is always an array
    };
  } else {
    // Create a show for a specific date directly in the shows table
    const showData = {
      name: slot.show_name,
      date: slot.date,
      time: slot.start_time,
      notes: `Host: ${slot.host_name || ''}\nIs prerecorded: ${slot.is_prerecorded ? 'Yes' : 'No'}\nIs collection: ${slot.is_collection ? 'Yes' : 'No'}`
    };
    
    console.log('Creating show for specific date:', showData);
    
    const { data: show, error: showError } = await supabase
      .from('shows')
      .insert(showData)
      .select()
      .single();
      
    if (showError) {
      console.error('Error creating show:', showError);
      throw showError;
    }
    
    console.log('Successfully created show:', show);
    
    // Return a constructed ScheduleSlot for compatibility
    return {
      id: show.id,
      show_name: slot.show_name,
      host_name: slot.host_name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      date: slot.date,
      is_prerecorded: slot.is_prerecorded || false,
      is_collection: slot.is_collection || false,
      color: slot.color || null,
      shows: [show],
      has_lineup: true
    };
  }
};

export const updateScheduleSlot = async (id: string, updates: Partial<ScheduleSlot>, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', { id, updates, isMasterSchedule, selectedDate });

  if (isMasterSchedule) {
    // Update master schedule slot in schedule_slots_old
    const updateData = {
      show_name: updates.show_name,
      host_name: updates.host_name,
      start_time: updates.start_time,
      end_time: updates.end_time,
      is_prerecorded: updates.is_prerecorded,
      is_collection: updates.is_collection,
      color: updates.color || null
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
    return {
      ...data,
      date: updates.date || format(new Date(), 'yyyy-MM-dd'),
      shows: [] // Ensure shows is always an array
    };
  } else {
    // For weekly schedule, we're updating a show
    // First, check if this is a slot_id or a show_id
    const { data: existingShow, error: showCheckError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (showCheckError) {
      console.error('Error checking show existence:', showCheckError);
      throw showCheckError;
    }
    
    if (existingShow) {
      // This is a show ID, update the show
      const showUpdateData = {
        name: updates.show_name,
        time: updates.start_time,
        notes: `Host: ${updates.host_name || ''}\nIs prerecorded: ${updates.is_prerecorded ? 'Yes' : 'No'}\nIs collection: ${updates.is_collection ? 'Yes' : 'No'}`
      };
      
      console.log('Updating show with data:', showUpdateData);
      
      const { data: updatedShow, error: updateError } = await supabase
        .from('shows')
        .update(showUpdateData)
        .eq('id', id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating show:', updateError);
        throw updateError;
      }
      
      console.log('Successfully updated show:', updatedShow);
      return {
        id: updatedShow.id,
        show_name: updatedShow.name,
        host_name: updates.host_name,
        start_time: updatedShow.time || '',
        end_time: updates.end_time || '',
        date: updatedShow.date || '',
        is_prerecorded: updates.is_prerecorded || false,
        is_collection: updates.is_collection || false,
        color: updates.color || null,
        shows: [updatedShow],
        has_lineup: true
      };
    } else {
      // This might be a slot_id from the master schedule
      // Create a new show based on this update
      const showData = {
        name: updates.show_name,
        date: updates.date,
        time: updates.start_time,
        notes: `Host: ${updates.host_name || ''}\nIs prerecorded: ${updates.is_prerecorded ? 'Yes' : 'No'}\nIs collection: ${updates.is_collection ? 'Yes' : 'No'}`,
        slot_id: id // Associate with the original slot
      };
      
      console.log('Creating show from master slot update:', showData);
      
      const { data: newShow, error: createError } = await supabase
        .from('shows')
        .insert(showData)
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating show from update:', createError);
        throw createError;
      }
      
      console.log('Successfully created show from update:', newShow);
      return {
        id: newShow.id,
        show_name: newShow.name,
        host_name: updates.host_name,
        start_time: newShow.time || '',
        end_time: updates.end_time || '',
        date: newShow.date || '',
        is_prerecorded: updates.is_prerecorded || false,
        is_collection: updates.is_collection || false,
        color: updates.color || null,
        shows: [newShow],
        has_lineup: true
      };
    }
  }
};

export const deleteScheduleSlot = async (id: string, isMasterSchedule: boolean = false, selectedDate?: Date): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule, selectedDate });

  if (isMasterSchedule) {
    // For master schedule, mark as deleted in schedule_slots_old
    const { error } = await supabase
      .from('schedule_slots_old')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting master schedule slot:', error);
      throw error;
    }
  } else {
    // Check if this is a show ID or a slot ID
    const { data: existingShow, error: showCheckError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (showCheckError) {
      console.error('Error checking show existence:', showCheckError);
      throw showCheckError;
    }
    
    if (existingShow) {
      // This is a show ID, delete the show
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting show:', error);
        throw error;
      }
    } else {
      // If no show with this ID exists, it might be referencing a master slot
      // We should add a "deletion" show for this date/time
      if (selectedDate) {
        const { data: slotData, error: slotError } = await supabase
          .from('schedule_slots_old')
          .select('*')
          .eq('id', id)
          .single();
          
        if (slotError || !slotData) {
          console.error('Error fetching slot data for deletion:', slotError);
          throw slotError || new Error('Slot not found');
        }
        
        // Create a "deletion" marker in the shows table
        const deletionShow = {
          name: "DELETED",
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: slotData.start_time,
          notes: "This slot was deleted from the weekly schedule",
          slot_id: id
        };
        
        const { error } = await supabase
          .from('shows')
          .insert(deletionShow);
          
        if (error) {
          console.error('Error creating deletion marker:', error);
          throw error;
        }
      }
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
