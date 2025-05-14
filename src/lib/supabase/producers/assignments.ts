import { supabase } from "@/lib/supabase";
import { format, startOfWeek, parseISO, isAfter, isSameDay } from 'date-fns';
import { ProducerAssignment } from '../types/producer.types';

export const getProducerAssignments = async (weekStart: Date) => {
  try {
    // Format as YYYY-MM-DD for consistent date handling
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    console.log(`Getting producer assignments for week starting ${formattedDate}`);
    
    // Create a query to fetch weekly assignments specific to this week
    const { data: weeklyAssignments, error: weeklyError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name,
          position,
          email,
          phone
        ),
        slot:slot_id (
          id,
          show_name,
          host_name,
          start_time,
          end_time,
          day_of_week
        )
      `)
      .eq('week_start', formattedDate)
      .eq('is_recurring', false)
      .eq('is_deleted', false);
      
    if (weeklyError) {
      console.error("Error fetching weekly assignments:", weeklyError);
      throw weeklyError;
    }
    
    console.log(`Retrieved ${weeklyAssignments?.length || 0} weekly assignments for ${formattedDate}`);
    
    // Get the specific week deletions (for overriding recurring assignments)
    const { data: weeklyDeletions, error: deletionsError } = await supabase
      .from('producer_assignments')
      .select(`
        slot_id,
        worker_id,
        role
      `)
      .eq('week_start', formattedDate)
      .eq('is_recurring', false)
      .eq('is_deleted', true);
    
    if (deletionsError) {
      console.error("Error fetching weekly deletions:", deletionsError);
      throw deletionsError;
    }
    
    // Create a set of keys for quick lookups of deleted assignments
    const deletionKeys = new Set();
    (weeklyDeletions || []).forEach(deletion => {
      const key = `${deletion.slot_id}-${deletion.worker_id}-${deletion.role}`;
      deletionKeys.add(key);
    });
    
    // Create a separate query to fetch recurring assignments that are valid for this week
    // They should:
    // 1. Start on or before this week 
    // 2. Either have no end_date or end_date after this week
    const { data: recurringAssignments, error: recurringError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name,
          position,
          email,
          phone
        ),
        slot:slot_id (
          id,
          show_name,
          host_name,
          start_time,
          end_time,
          day_of_week
        )
      `)
      .eq('is_recurring', true)
      .lte('week_start', formattedDate); // Only get recurring assignments that start on or before the current week
    
    if (recurringError) {
      console.error("Error fetching recurring assignments:", recurringError);
      throw recurringError;
    }
    
    console.log(`Retrieved ${recurringAssignments?.length || 0} recurring assignments for week starting on or before ${formattedDate}`);
    
    // Filter out any recurring assignments that have been specifically deleted for this week
    // or have an end_date before or on this week
    const filteredRecurringAssignments = (recurringAssignments || []).filter(assignment => {
      // Create a unique key for this assignment
      const key = `${assignment.slot_id}-${assignment.worker_id}-${assignment.role}`;
      
      // Check if this assignment has been overridden with a deletion for this week
      const isDeleted = deletionKeys.has(key);
      
      // Check if the assignment has ended (end_date is before or equal to this week)
      const hasEnded = assignment.end_date && !isAfter(parseISO(assignment.end_date), parseISO(formattedDate));
      
      // Keep the assignment only if it's not deleted and hasn't ended
      return !isDeleted && !hasEnded;
    });
    
    console.log(`After filtering out deletions, ${filteredRecurringAssignments.length} recurring assignments remain`);
    
    // Combine both types of assignments
    const combinedAssignments = [
      ...(weeklyAssignments || []),
      ...filteredRecurringAssignments
    ];
    
    console.log(`Total combined assignments: ${combinedAssignments.length}`);
    return combinedAssignments;
  } catch (error) {
    console.error("Error fetching producer assignments:", error);
    throw error;
  }
};

export const getAllMonthlyAssignments = async (year: number, month: number) => {
  try {
    // Get the first and last day of the requested month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Find assignments where week_start is within the month
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name,
          position,
          email
        ),
        slot:slot_id (
          id,
          show_name,
          host_name,
          day_of_week
        )
      `)
      .gte('week_start', startDateStr)
      .lte('week_start', endDateStr);
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching monthly assignments:", error);
    throw error;
  }
};

export const createProducerAssignment = async (assignment: Omit<ProducerAssignment, 'id'>) => {
  try {
    // Check if a duplicate assignment already exists
    const { data: existing, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', assignment.slot_id)
      .eq('worker_id', assignment.worker_id)
      .eq('role', assignment.role)
      .eq('week_start', assignment.week_start);
      
    if (checkError) throw checkError;
    
    if (existing && existing.length > 0) {
      console.log("Assignment already exists, not creating duplicate:", existing[0]);
      return existing[0];
    }
    
    // If no duplicate, create the new assignment
    console.log("Creating new producer assignment:", assignment);
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert(assignment)
      .select()
      .single();
      
    if (error) throw error;
    
    console.log("Producer assignment created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating producer assignment:", error);
    throw error;
  }
};

export const createRecurringProducerAssignment = async (
  slotId: string, 
  workerId: string, 
  role: string,
  weekStart: string
) => {
  try {
    console.log(`Creating recurring assignment for slot ${slotId}, worker ${workerId}, role ${role}, starting from week ${weekStart}`);
    
    // Check if a recurring assignment already exists for this specific combination
    // that starts on or after the current week_start date
    const { data: existing, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', slotId)
      .eq('worker_id', workerId)
      .eq('role', role)
      .eq('is_recurring', true)
      .lte('week_start', weekStart); // Check for assignments starting on or before this week
      
    if (checkError) throw checkError;
    
    if (existing && existing.length > 0) {
      console.log("Recurring assignment already exists for this time period");
      return true;
    }
    
    // Create a new recurring assignment with the specified week_start date
    // This ensures the assignment only affects weeks from the specified start date forward
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert({
        slot_id: slotId,
        worker_id: workerId,
        role: role,
        is_recurring: true,
        week_start: weekStart // Store the start date for the recurring assignment
      })
      .select();
      
    if (error) throw error;
    
    console.log("Successfully created recurring assignment:", data);
    return true;
  } catch (error: any) {
    console.error("Error creating recurring assignment:", error);
    throw new Error(error.message || "Failed to create recurring assignment");
  }
};

export const deleteProducerAssignment = async (id: string, deleteMode: 'current' | 'future' = 'current') => {
  try {
    console.log(`Deleting producer assignment ${id} with mode: ${deleteMode}`);
    
    // First, get the assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching assignment details:", fetchError);
      throw fetchError;
    }
    
    if (!assignment) {
      console.error("Assignment not found");
      throw new Error('Assignment not found');
    }
    
    // For non-recurring assignments, simply delete the specific assignment
    if (!assignment.is_recurring) {
      console.log("Deleting non-recurring assignment");
      const { error } = await supabase
        .from('producer_assignments')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting assignment:", error);
        throw error;
      }
      
      return true;
    }
    
    // For recurring assignments when only deleting current week:
    if (deleteMode === 'current') {
      console.log("This is a recurring assignment but we're only deleting this week's instance");
      
      // First check if a deletion record already exists for this week
      const { data: existingDeletion, error: checkError } = await supabase
        .from('producer_assignments')
        .select('id')
        .eq('slot_id', assignment.slot_id)
        .eq('worker_id', assignment.worker_id)
        .eq('role', assignment.role)
        .eq('week_start', assignment.week_start)
        .eq('is_deleted', true)
        .eq('is_recurring', false)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking for existing deletion:", checkError);
        throw checkError;
      }
      
      // If a deletion record already exists, no need to create another one
      if (existingDeletion) {
        console.log("Deletion record already exists for this week");
        return true;
      }
      
      // Create a non-recurring assignment with is_deleted=true for this specific week to override the recurring one
      const { error } = await supabase
        .from('producer_assignments')
        .insert({
          slot_id: assignment.slot_id,
          worker_id: assignment.worker_id,
          role: assignment.role,
          week_start: assignment.week_start,
          is_recurring: false,
          is_deleted: true, // Mark as deleted for this specific week
          notes: assignment.notes // Preserve original notes
        });
        
      if (error) {
        console.error("Error creating override record:", error);
        throw error;
      }
      
      return true;
    }
    
    // For recurring assignments in 'future' mode:
    if (deleteMode === 'future') {
      console.log("Deleting recurring assignment for future weeks");
      
      // Get current date and its week start to make sure we don't affect past weeks
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      const formattedCurrentWeekStart = format(currentWeekStart, 'yyyy-MM-dd');
      
      // Parse assignment's week_start to a Date for comparison
      const assignmentWeekStart = new Date(assignment.week_start);
      
      console.log(`Current week: ${formattedCurrentWeekStart}, Assignment week: ${assignment.week_start}`);
      
      // If the assignment started before the current week, we need to preserve past weeks
      if (assignmentWeekStart < currentWeekStart || isSameDay(assignmentWeekStart, currentWeekStart)) {
        console.log("Assignment started in the past or current week, preserving past weeks by setting end_date");
        
        // Set end_date to the current week start to preserve all past weeks and include current week
        // But exclude future weeks
        const { error: updateError } = await supabase
          .from('producer_assignments')
          .update({
            end_date: format(startOfWeek(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 0 }), 'yyyy-MM-dd')
            // ^^ Set the end date to be the start of next week, so current week is still included
          })
          .eq('id', id);
          
        if (updateError) {
          console.error("Error updating recurring assignment with end date:", updateError);
          throw updateError;
        }
      } else {
        // If the assignment starts in the future, delete it completely
        console.log("Assignment starts in future, deleting it entirely");
        const { error: deleteError } = await supabase
          .from('producer_assignments')
          .delete()
          .eq('id', id);
          
        if (deleteError) {
          console.error("Error deleting future recurring assignment:", deleteError);
          throw deleteError;
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error deleting producer assignment:", error);
    throw error;
  }
};
