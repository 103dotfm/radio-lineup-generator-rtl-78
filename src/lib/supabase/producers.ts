
import { format, startOfWeek } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { ProducerAssignment } from '@/types/schedule';

export interface Worker {
  id: string;
  name: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
}

export interface ProducerWorkArrangement {
  id: string;
  week_start: string;
  notes: string;
}

// Re-export the ProducerAssignment type so it can be imported from this file
export type { ProducerAssignment };

// Get workers (for producer assignments)
export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching workers:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getWorkers:', error);
    throw error;
  }
};

// This function is needed by ProducersTable.tsx and MonthlySummary.tsx
export const getProducers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('department', 'producers')
      .order('name');

    if (error) {
      console.error('Error fetching producers:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProducers:', error);
    throw error;
  }
};

// Create a new worker
export const createWorker = async (workerData: { name: string } & Partial<Worker>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert(workerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating worker:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createWorker:', error);
    throw error;
  }
};

// Update a worker
export const updateWorker = async (id: string, workerData: Partial<Worker>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .update(workerData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating worker:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateWorker:', error);
    throw error;
  }
};

// Delete a worker
export const deleteWorker = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting worker:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteWorker:', error);
    return false;
  }
};

// Get producer roles
export const getProducerRoles = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching producer roles:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProducerRoles:', error);
    return [];
  }
};

// Get or create producer work arrangement
export const getOrCreateProducerWorkArrangement = async (date: Date): Promise<ProducerWorkArrangement | null> => {
  const weekStart = format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
  
  try {
    // Try to fetch existing arrangement
    const { data, error } = await supabase
      .from('producer_work_arrangements')
      .select('*')
      .eq('week_start', weekStart)
      .single();
      
    if (!error && data) {
      return data;
    }
    
    // If not found, create a new one
    const { data: newData, error: createError } = await supabase
      .from('producer_work_arrangements')
      .insert({
        week_start: weekStart,
        notes: ''
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating producer work arrangement:', createError);
      throw createError;
    }
    
    return newData;
  } catch (error) {
    console.error('Error in getOrCreateProducerWorkArrangement:', error);
    throw error;
  }
};

// Update producer work arrangement notes
export const updateProducerWorkArrangementNotes = async (id: string, notes: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('producer_work_arrangements')
      .update({
        notes
      })
      .eq('id', id);
      
    if (error) {
      console.error('Error updating producer work arrangement notes:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateProducerWorkArrangementNotes:', error);
    throw error;
  }
};

// Create a producer assignment
export const createProducerAssignment = async (assignment: {
  slot_id: string;
  worker_id: string;
  role: string;
  week_start: string;
  is_recurring?: boolean;
}): Promise<ProducerAssignment | null> => {
  try {
    console.log("Creating producer assignment:", assignment);
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert(assignment)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating producer assignment:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createProducerAssignment:', error);
    throw error;
  }
};

// Create recurring producer assignment
export const createRecurringProducerAssignment = async (
  slotId: string, 
  workerId: string, 
  role: string, 
  weekStart: string
): Promise<boolean> => {
  try {
    // Create a recurring assignment
    const assignment = {
      slot_id: slotId,
      worker_id: workerId,
      role: role,
      week_start: weekStart,
      is_recurring: true
    };
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert(assignment)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating recurring producer assignment:', error);
      throw error;
    }

    return data !== null;
  } catch (error) {
    console.error('Error in createRecurringProducerAssignment:', error);
    return false;
  }
};

// Delete a producer assignment
export const deleteProducerAssignment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('producer_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting producer assignment:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProducerAssignment:', error);
    return false;
  }
};

// Get producer assignments for a specific week
export const getProducerAssignments = async (date: Date): Promise<ProducerAssignment[]> => {
  const weekStart = format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
  
  try {
    // First get assignments for this week
    const { data: weeklyAssignments, error: weeklyError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:workers(id, name, position)
      `)
      .eq('week_start', weekStart);
      
    if (weeklyError) {
      console.error('Error fetching weekly producer assignments:', weeklyError);
      throw weeklyError;
    }
    
    // Then get recurring assignments that should apply to this week
    const { data: recurringAssignments, error: recurringError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:workers(id, name, position)
      `)
      .eq('is_recurring', true);
      
    if (recurringError) {
      console.error('Error fetching recurring producer assignments:', recurringError);
      throw recurringError;
    }
    
    // Combine both types of assignments
    // Weekly assignments take precedence over recurring ones for the same slot and worker
    const assignments = [...(weeklyAssignments || [])];
    
    // Add recurring assignments that don't conflict with weekly assignments
    if (recurringAssignments) {
      for (const recurringAssignment of recurringAssignments) {
        // Check if we already have a weekly assignment for this slot and worker
        const hasWeeklyAssignment = assignments.some(
          a => a.slot_id === recurringAssignment.slot_id && 
               a.worker_id === recurringAssignment.worker_id &&
               a.role === recurringAssignment.role
        );
        
        if (!hasWeeklyAssignment) {
          // Add this recurring assignment to the list
          assignments.push({
            ...recurringAssignment,
            week_start: weekStart // Override with current week
          });
        }
      }
    }
    
    return assignments;
  } catch (error) {
    console.error('Error in getProducerAssignments:', error);
    throw error;
  }
};

// Get all monthly assignments for the monthly summary
export const getAllMonthlyAssignments = async (year: number, month: number): Promise<ProducerAssignment[]> => {
  try {
    // Format month with leading zero if needed
    const monthStr = month.toString().padStart(2, '0');
    
    // Find all assignments for the given month
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:workers(id, name, position)
      `)
      .like('week_start', `${year}-${monthStr}-%`);
      
    if (error) {
      console.error('Error fetching monthly producer assignments:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllMonthlyAssignments:', error);
    return [];
  }
};
