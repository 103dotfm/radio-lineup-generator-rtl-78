
import { supabase } from "@/lib/supabase";
import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay, format, parseISO, addWeeks } from 'date-fns';

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
    
    // Transform slots to match ScheduleSlot type
    const transformedSlots = slots?.map(slot => {
      // Calculate date based on day_of_week for display purposes
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      const slotDate = addDays(currentWeekStart, slot.day_of_week);
      const formattedDate = format(slotDate, 'yyyy-MM-dd');
      
      return {
        ...slot,
        date: formattedDate,
        shows: [],
        has_lineup: false,
        fromMaster: true
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

  // Get shows directly from the shows table for this week - these are actual shows that will override master schedule
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
  
  // Get master slots from schedule_slots_old
  const { data: masterSlots, error: masterSlotsError } = await supabase
    .from('schedule_slots_old')
    .select('*')
    .eq('is_recurring', true)
    .eq('is_deleted', false);
  
  if (masterSlotsError) {
    console.error('Error fetching master slots:', masterSlotsError);
    throw masterSlotsError;
  }

  // Map to track which time slots are filled by shows (to avoid duplicates)
  // The key will be a combination of date and time
  const filledSlots = new Map();
  const resultSlots: ScheduleSlot[] = [];
  
  // First, process the actual shows for this week (these take precedence)
  if (shows && shows.length > 0) {
    for (const show of shows) {
      // For each show, create a virtual slot
      const slotKey = `${show.date}-${show.time}`;
      
      // Check if this is a "DELETED" marker
      const isDeleted = show.name === "DELETED";
      
      if (isDeleted) {
        // If it's a deletion marker, just record this time slot as filled
        // but don't create a slot for it
        filledSlots.set(slotKey, true);
        continue;
      }
      
      // If not a deletion marker, create a slot for this show
      const showSlot: ScheduleSlot = {
        id: show.id,
        show_name: show.name,
        host_name: show.notes ? extractHostName(show.notes) : null,
        start_time: show.time || "00:00",
        end_time: incrementTimeByHour(show.time || "00:00"),
        date: show.date,
        is_recurring: false,
        is_prerecorded: show.notes ? extractPrerecorded(show.notes) : false,
        is_collection: show.notes ? extractCollection(show.notes) : false,
        is_deleted: false,
        color: null,
        shows: [show],
        has_lineup: true
      };
      
      resultSlots.push(showSlot);
      filledSlots.set(slotKey, true);
    }
  }
  
  // Now, fill in slots from the master schedule for any time slots that aren't already filled
  if (masterSlots && masterSlots.length > 0) {
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(startDate, i);
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday
      
      // Get master slots for this day of week
      const daySlotsFromMaster = masterSlots.filter(slot => slot.day_of_week === dayOfWeek);
      
      // For each master slot on this day
      for (const masterSlot of daySlotsFromMaster) {
        const slotKey = `${formattedDate}-${masterSlot.start_time}`;
        
        // Skip if we already have a show for this time slot
        if (filledSlots.has(slotKey)) {
          continue;
        }
        
        // Only apply master schedule to current and future weeks, not past weeks
        const isDateBeforeToday = isBefore(new Date(formattedDate), startOfDay(new Date()));
        const selectedDateInFuture = selectedDate && isAfter(selectedDate, new Date());

        // If it's a past date and not selected in the future, don't use master schedule
        if (isDateBeforeToday && !selectedDateInFuture) {
          continue;
        }
        
        // Create a slot from the master schedule
        const masterScheduleSlot: ScheduleSlot = {
          ...masterSlot,
          date: formattedDate,
          shows: [],
          has_lineup: false,
          fromMaster: true
        };
        
        resultSlots.push(masterScheduleSlot);
        filledSlots.set(slotKey, true);
      }
    }
  }
  
  // Sort all slots by date and then time
  resultSlots.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.start_time.localeCompare(b.start_time);
  });
  
  console.log('Final transformed slots:', resultSlots);
  return resultSlots;
};

// Helper functions
function incrementTimeByHour(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newHours = (hours + 1) % 24;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function extractHostName(notes: string): string | null {
  const match = notes.match(/Host:\s*([^\n]*)/);
  return match ? match[1].trim() : null;
}

function extractPrerecorded(notes: string): boolean {
  const match = notes.match(/Is prerecorded:\s*(Yes|No)/i);
  return match ? match[1].toLowerCase() === 'yes' : false;
}

function extractCollection(notes: string): boolean {
  const match = notes.match(/Is collection:\s*(Yes|No)/i);
  return match ? match[1].toLowerCase() === 'yes' : false;
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
