
import { format, startOfWeek } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { ProducerAssignment } from '@/types/schedule';
import { getAppDomain } from '@/integrations/supabase/client';

export interface Worker {
  id: string;
  name: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  user_id?: string;
  password_readable?: string;
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

// Get producers (needed by ProducersTable.tsx and MonthlySummary.tsx)
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

// Create a system user for a producer using an edge function
export const createProducerUser = async (workerId: string, email: string): Promise<{
  success: boolean;
  password?: string;
  message?: string;
  error?: any;
}> => {
  try {
    // Check if the worker already has a user
    const { data: worker } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();
    
    if (worker?.user_id) {
      return {
        success: false,
        message: 'המשתמש כבר קיים במערכת'
      };
    }
    
    // Get the base URL for the Supabase project
    const appDomain = await getAppDomain();
    const supabaseUrl = new URL(appDomain).origin;
    
    // Call the edge function to create the user
    const response = await fetch(`${supabaseUrl}/functions/v1/create-producer-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
      },
      body: JSON.stringify({ 
        workerId, 
        email 
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error from edge function:', result);
      return {
        success: false,
        message: result.message || 'שגיאה ביצירת משתמש',
        error: result.error
      };
    }
    
    return {
      success: true,
      password: result.password
    };
  } catch (error: any) {
    console.error('Error in createProducerUser:', error);
    return {
      success: false,
      error,
      message: error.message
    };
  }
};

// Reset producer password using an edge function
export const resetProducerPassword = async (workerId: string): Promise<{
  success: boolean;
  password?: string;
  message?: string;
  error?: any;
}> => {
  try {
    // Get the base URL for the Supabase project
    const appDomain = await getAppDomain();
    const supabaseUrl = new URL(appDomain).origin;
    
    // Call the edge function to reset the password
    const response = await fetch(`${supabaseUrl}/functions/v1/reset-producer-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
      },
      body: JSON.stringify({ workerId })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error from edge function:', result);
      return {
        success: false,
        message: result.message || 'שגיאה באיפוס סיסמה',
        error: result.error
      };
    }
    
    return {
      success: true,
      password: result.password
    };
  } catch (error: any) {
    console.error('Error in resetProducerPassword:', error);
    return {
      success: false,
      error,
      message: error.message
    };
  }
};

// Helper function to generate a strong random password
const generateStrongPassword = (length: number): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
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
    // First, verify that slot exists in schedule_slots_old table
    const { data: slotExists, error: slotCheckError } = await supabase
      .from('schedule_slots_old')
      .select('id')
      .eq('id', assignment.slot_id)
      .maybeSingle();

    if (slotCheckError) {
      console.error('Failed to find slot in schedule_slots_old:', slotCheckError);
      throw new Error(`Failed to verify slot existence: ${slotCheckError.message}`);
    }
    
    if (!slotExists) {
      console.error(`Slot with ID ${assignment.slot_id} does not exist in schedule_slots_old table`);
      throw new Error(`Slot with ID ${assignment.slot_id} not found`);
    }
    
    // Check if an assignment with the same slot, worker, and role already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', assignment.slot_id)
      .eq('worker_id', assignment.worker_id)
      .eq('role', assignment.role)
      .eq('week_start', assignment.week_start)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing assignment:', checkError);
      throw checkError;
    }
    
    if (existingAssignment) {
      console.log('Assignment already exists:', existingAssignment);
      return existingAssignment;
    }

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
    // First, verify that slot exists in schedule_slots_old table
    const { data: slotExists, error: slotCheckError } = await supabase
      .from('schedule_slots_old')
      .select('id')
      .eq('id', slotId)
      .maybeSingle();

    if (slotCheckError) {
      console.error('Failed to find slot in schedule_slots_old:', slotCheckError);
      throw new Error(`Failed to verify slot existence: ${slotCheckError.message}`);
    }
    
    if (!slotExists) {
      console.error(`Slot with ID ${slotId} does not exist in schedule_slots_old table`);
      throw new Error(`Slot with ID ${slotId} not found`);
    }
    
    // Check if this recurring assignment already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', slotId)
      .eq('worker_id', workerId)
      .eq('role', role)
      .eq('is_recurring', true)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing recurring assignment:', checkError);
      throw checkError;
    }
    
    if (existingAssignment) {
      console.log('Recurring assignment already exists:', existingAssignment);
      return true;
    }

    // Create a recurring assignment
    const assignment = {
      slot_id: slotId,
      worker_id: workerId,
      role: role,
      week_start: weekStart,
      is_recurring: true
    };
    
    console.log("Creating recurring producer assignment with data:", assignment);
    
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
