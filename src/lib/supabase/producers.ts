
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, parseISO } from 'date-fns';
import { getProducersByDivision, getProducers as fetchProducers, getProducerRoles as fetchProducerRoles } from './producers/workers';
import { createProducerUser, resetProducerPassword } from './producers/users';
import { 
  getProducerAssignments, 
  getAllMonthlyAssignments,
  createProducerAssignment,
  createRecurringProducerAssignment,
  deleteProducerAssignment
} from './producers/assignments';

// Re-export functions from the users module
export { createProducerUser, resetProducerPassword };

// Re-export functions from the workers module
export const getProducers = fetchProducers;
export const getProducerRoles = fetchProducerRoles;
export { getProducersByDivision };

// Re-export functions from the assignments module
export {
  getProducerAssignments,
  getAllMonthlyAssignments,
  createProducerAssignment,
  createRecurringProducerAssignment,
  deleteProducerAssignment
};

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
