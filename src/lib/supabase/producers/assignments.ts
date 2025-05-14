
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, parseISO, isAfter, isSameDay, addWeeks, subDays, isBefore } from 'date-fns';
import { ProducerAssignment } from '../types/producer.types';

export const getProducerAssignments = async (weekStart: Date) => {
  try {
    // Format as YYYY-MM-DD for consistent date handling
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    console.log(`Getting producer assignments for week starting ${formattedDate}`);
    
    // 1. First get weekly (non-recurring) assignments for this specific week that are NOT deleted
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
    
    // 2. Get list of explicit deletions for this week (to filter out recurring assignments)
    // These are non-recurring entries with is_deleted=true for this specific week
    const { data: deletions, error: deletionsError } = await supabase
      .from('producer_assignments')
      .select('slot_id, worker_id, role')
      .eq('week_start', formattedDate)
      .eq('is_recurring', false)
      .eq('is_deleted', true);
    
    if (deletionsError) {
      console.error("Error fetching weekly deletions:", deletionsError);
      throw deletionsError;
    }
    
    console.log(`Retrieved ${deletions?.length || 0} explicit deletions for ${formattedDate}`);
    
    // Create a set of deletion keys for efficient lookups
    const deletionKeys = new Set();
    if (deletions) {
      deletions.forEach(deletion => {
        const key = `${deletion.slot_id}|${deletion.worker_id}|${deletion.role}`;
        deletionKeys.add(key);
      });
    }
    
    // 3. Get recurring assignments that apply to this week
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
      .lte('week_start', formattedDate) // Assignment starts on or before this week
      .is('is_deleted', false); // Explicitly not deleted recurring assignments
    
    if (recurringError) {
      console.error("Error fetching recurring assignments:", recurringError);
      throw recurringError;
    }
    
    console.log(`Retrieved ${recurringAssignments?.length || 0} recurring assignments for week starting on or before ${formattedDate}`);
    
    // Filter recurring assignments by:
    // 1. Not explicitly deleted for this week (checked against deletionKeys)
    // 2. Not ended before this week (end_date is null or after/equal to this week)
    const filteredRecurringAssignments = (recurringAssignments || []).filter(assignment => {
      // Check if explicitly deleted for this week
      const deletionKey = `${assignment.slot_id}|${assignment.worker_id}|${assignment.role}`;
      const isExplicitlyDeleted = deletionKeys.has(deletionKey);
      
      // Check if assignment has ended before this week
      const hasEnded = assignment.end_date && isBefore(parseISO(assignment.end_date), parseISO(formattedDate));
      
      // Keep only if not deleted and not ended
      return !isExplicitlyDeleted && !hasEnded;
    });
    
    console.log(`After filtering, ${filteredRecurringAssignments.length} recurring assignments remain`);
    
    // Combine both assignment types
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
      .eq('week_start', assignment.week_start)
      .eq('is_recurring', false)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existing) {
      console.log("Assignment already exists, updating instead of creating:", existing);
      
      // Update the existing assignment to ensure it's not deleted
      const { data: updated, error: updateError } = await supabase
        .from('producer_assignments')
        .update({ is_deleted: false, notes: assignment.notes })
        .eq('id', existing.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      return updated;
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
    const { data: existing, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', slotId)
      .eq('worker_id', workerId)
      .eq('role', role)
      .eq('is_recurring', true)
      .maybeSingle();
      
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existing) {
      console.log("Recurring assignment already exists:", existing);
      
      // If it exists but has an end_date before or on this week, 
      // remove the end_date to re-activate it for future weeks
      if (existing.end_date && !isAfter(parseISO(existing.end_date), parseISO(weekStart))) {
        const { error: updateError } = await supabase
          .from('producer_assignments')
          .update({ end_date: null })
          .eq('id', existing.id);
          
        if (updateError) throw updateError;
        console.log("Reactivated existing recurring assignment by removing end_date");
      }
      
      return true;
    }
    
    // Create a new recurring assignment
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert({
        slot_id: slotId,
        worker_id: workerId,
        role: role,
        is_recurring: true,
        week_start: weekStart,
        is_deleted: false
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
    
    // For recurring assignments, handle differently based on delete mode
    if (deleteMode === 'current') {
      console.log("Deleting just this week's instance of a recurring assignment");
      
      try {
        // First check if an override already exists
        const { data: existingOverride, error: checkError } = await supabase
          .from('producer_assignments')
          .select('*')
          .eq('slot_id', assignment.slot_id)
          .eq('worker_id', assignment.worker_id)
          .eq('role', assignment.role)
          .eq('week_start', assignment.week_start)
          .eq('is_recurring', false);
        
        if (checkError) {
          console.error("Error checking for existing override:", checkError);
          throw checkError;
        }
        
        if (existingOverride && existingOverride.length > 0) {
          // If an override already exists, update it to be deleted
          console.log("Found existing override, updating it to deleted:", existingOverride[0]);
          
          const { error: updateError } = await supabase
            .from('producer_assignments')
            .update({ is_deleted: true })
            .eq('id', existingOverride[0].id);
            
          if (updateError) {
            console.error("Error updating existing override:", updateError);
            throw updateError;
          }
        } else {
          // Create a new non-recurring override with is_deleted=true
          console.log("Creating new deletion override");
          
          const { error: insertError } = await supabase
            .from('producer_assignments')
            .insert({
              slot_id: assignment.slot_id,
              worker_id: assignment.worker_id,
              role: assignment.role,
              week_start: assignment.week_start,
              is_recurring: false,
              is_deleted: true
            });
            
          if (insertError) {
            console.error("Error creating override record:", insertError);
            throw insertError;
          }
        }
        
        return true;
      } catch (error) {
        console.error("Error handling current week deletion:", error);
        throw error;
      }
    } else if (deleteMode === 'future') {
      console.log("Deleting recurring assignment for future weeks");
      
      // Get current date and format it for consistent comparison
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      
      // Parse assignment's week_start to a Date for comparison
      const assignmentWeekStart = parseISO(assignment.week_start);
      
      console.log(`Current week: ${format(currentWeekStart, 'yyyy-MM-dd')}, Assignment week: ${assignment.week_start}`);
      
      // If the assignment started before the current week, we need to preserve past weeks
      if (isBefore(assignmentWeekStart, currentWeekStart)) {
        console.log("Assignment started in the past, preserving past weeks by setting end_date");
        
        // Use the day before current week starts as the end_date
        // This preserves all past assignments
        const endDate = format(subDays(currentWeekStart, 1), 'yyyy-MM-dd');
        console.log(`Setting end_date to ${endDate} to preserve past assignments`);
        
        const { error: updateError } = await supabase
          .from('producer_assignments')
          .update({
            end_date: endDate
          })
          .eq('id', id);
          
        if (updateError) {
          console.error("Error updating recurring assignment with end date:", updateError);
          throw updateError;
        }
      } else {
        // If the assignment starts in this week or future, delete it completely
        console.log("Assignment starts in current week or future, deleting it entirely");
        
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
