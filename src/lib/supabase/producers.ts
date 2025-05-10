import { supabase } from "@/lib/supabase";
import { format, startOfWeek, parseISO, addDays } from 'date-fns';
import { getProducersByDivision, getProducers as fetchProducers, getProducerRoles as fetchProducerRoles } from './producers/workers';

// Re-export functions from the workers module
export const getProducers = fetchProducers;
export const getProducerRoles = fetchProducerRoles;

// Types
export type ProducerAssignment = {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  week_start: string;
  notes?: string | null;
  is_recurring?: boolean;
  created_at?: string;
  updated_at?: string;
  worker?: Worker;
  slot?: ScheduleSlot;
};

export type Worker = {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  user_id?: string | null;
  password_readable?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ScheduleSlot = {
  id: string;
  show_name: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export const getProducerRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};

export const getProducers = async () => {
  try {
    console.log('producers.ts: Fetching workers from Supabase...');
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    console.log(`Workers data fetched successfully: ${data?.length} workers`, data);
    return data;
  } catch (error) {
    console.error("Error fetching producers:", error);
    throw error;
  }
};

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
    
    // Create a separate query to fetch recurring assignments
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
      .eq('is_recurring', true);
    
    if (recurringError) {
      console.error("Error fetching recurring assignments:", recurringError);
      throw recurringError;
    }
    
    console.log(`Retrieved ${recurringAssignments?.length || 0} recurring assignments`);
    
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

export const getOrCreateProducerWorkArrangement = async (weekStart: Date) => {
  try {
    // Format as YYYY-MM-DD for consistent date handling
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    
    // First try to get existing arrangement
    const { data, error } = await supabase
      .from('producer_work_arrangements')
      .select('*')
      .eq('week_start', formattedDate)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 means no rows returned - create a new arrangement
        const { data: newArrangement, error: createError } = await supabase
          .from('producer_work_arrangements')
          .insert({ week_start: formattedDate })
          .select()
          .single();
          
        if (createError) throw createError;
        return newArrangement;
      } else {
        throw error;
      }
    }
    
    return data;
  } catch (error) {
    console.error("Error with producer work arrangement:", error);
    throw error;
  }
};

export const updateProducerWorkArrangementNotes = async (id: string, notes: string) => {
  try {
    const { error } = await supabase
      .from('producer_work_arrangements')
      .update({ notes })
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating arrangement notes:", error);
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
    // Check if a recurring assignment already exists
    const { data: existing, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', slotId)
      .eq('worker_id', workerId)
      .eq('role', role)
      .eq('is_recurring', true);
      
    if (checkError) throw checkError;
    
    if (existing && existing.length > 0) {
      console.log("Recurring assignment already exists");
      return true;
    }
    
    const { error } = await supabase
      .from('producer_assignments')
      .insert({
        slot_id: slotId,
        worker_id: workerId,
        role: role,
        is_recurring: true,
        week_start: weekStart
      });
      
    if (error) throw error;
    
    return true;
  } catch (error: any) {
    console.error("Error creating recurring assignment:", error);
    throw new Error(error.message || "Failed to create recurring assignment");
  }
};

export const deleteProducerAssignment = async (id: string) => {
  try {
    const { error } = await supabase
      .from('producer_assignments')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting producer assignment:", error);
    throw error;
  }
};

// Add missing functions for ProducerUsers
export const createProducerUser = async (workerId: string, email: string) => {
  try {
    // Call the edge function to create a user
    const { data, error } = await supabase.functions.invoke('create-producer-user', {
      body: { worker_id: workerId, email },
    });
    
    if (error) throw error;
    return data || { success: false, message: 'Unknown error' };
  } catch (error: any) {
    console.error("Error creating producer user:", error);
    return { 
      success: false, 
      message: error.message || "Failed to create user" 
    };
  }
};

export const resetProducerPassword = async (workerId: string) => {
  try {
    // Call the edge function to reset a password
    const { data, error } = await supabase.functions.invoke('reset-producer-password', {
      body: { worker_id: workerId },
    });
    
    if (error) throw error;
    return data || { success: false, message: 'Unknown error' };
  } catch (error: any) {
    console.error("Error resetting producer password:", error);
    return { 
      success: false, 
      message: error.message || "Failed to reset password" 
    };
  }
};
