
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, parseISO } from 'date-fns';
import { ProducerAssignment } from '@/types/schedule';

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
    
    const { data, error } = await supabase
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
      .eq('week_start', formattedDate);
      
    if (error) throw error;
    
    console.log(`Retrieved ${data?.length} producer assignments for week ${formattedDate}`, data);
    return data;
  } catch (error) {
    console.error("Error fetching producer assignments:", error);
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
