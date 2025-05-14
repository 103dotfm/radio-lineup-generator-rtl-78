import { supabase } from "@/lib/supabase";
import { format, startOfWeek } from 'date-fns';
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
      .eq('is_recurring', false);
      
    if (weeklyError) {
      console.error("Error fetching weekly assignments:", weeklyError);
      throw weeklyError;
    }
    
    console.log(`Retrieved ${weeklyAssignments?.length || 0} weekly assignments for ${formattedDate}`);
    
    // Create a separate query to fetch recurring assignments that start on or before this week
    // This ensures we only get recurring assignments that are valid for the current week and future
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
    
    // Combine both types of assignments
    const combinedAssignments = [
      ...(weeklyAssignments || []),
      ...(recurringAssignments || [])
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
    // First, get the assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!assignment) throw new Error('Assignment not found');
    
    // For non-recurring assignments or 'current' mode, just delete the specific assignment
    if (!assignment.is_recurring || deleteMode === 'current') {
      const { error } = await supabase
        .from('producer_assignments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return true;
    }
    
    // For recurring assignments in 'future' mode:
    // 1. Delete the current recurring assignment
    // 2. Create a new recurring assignment that covers only past weeks if needed
    if (deleteMode === 'future' && assignment.is_recurring) {
      const today = new Date();
      const weekStart = format(assignment.week_start, 'yyyy-MM-dd');
      const assignmentStartDate = new Date(weekStart);
      
      // Delete current recurring assignment
      const { error: deleteError } = await supabase
        .from('producer_assignments')
        .delete()
        .eq('id', id);
        
      if (deleteError) throw deleteError;
      
      // If the assignment started in the past, create a new assignment that ends with the current week
      // This ensures past weeks remain assigned
      if (assignmentStartDate < today) {
        console.log("Assignment started in the past, preserving past weeks assignments");
        
        // Create a replacement recurring assignment that only applies to past weeks
        const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd');
        
        // We don't need to create any replacements if the original assignment started in the current week or future
        if (weekStart !== currentWeekStart) {
          // This assignment won't affect future weeks because it will be filtered out in the query
          // that checks for week_start <= current week
          const { error: createError } = await supabase
            .from('producer_assignments')
            .insert({
              slot_id: assignment.slot_id,
              worker_id: assignment.worker_id,
              role: assignment.role,
              is_recurring: true,
              week_start: assignment.week_start,
              notes: assignment.notes
            });
            
          if (createError) throw createError;
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
