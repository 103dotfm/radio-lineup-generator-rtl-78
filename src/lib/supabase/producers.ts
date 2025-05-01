import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export interface ProducerRole {
  id: string;
  name: string;
}

export interface ProducerAssignment {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  notes?: string;
  is_recurring: boolean;
  week_start: string;
  worker?: {
    id: string;
    name: string;
    position?: string;
  };
  slot?: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    show_name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ProducerWorkArrangement {
  id: string;
  week_start: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch producer roles
export const getProducerRoles = async (): Promise<ProducerRole[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching producer roles:', error);
    return [];
  }
};

// Create a new producer role
export const createProducerRole = async (name: string): Promise<ProducerRole | null> => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .insert({ name })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating producer role:', error);
    return null;
  }
};

// Delete a producer role
export const deleteProducerRole = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('producer_roles')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting producer role:', error);
    return false;
  }
};

// Fetch producer assignments for a specific week
export const getProducerAssignments = async (weekStart: Date): Promise<ProducerAssignment[]> => {
  try {
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:workers (id, name, position),
        slot:schedule_slots (id, day_of_week, start_time, end_time, show_name)
      `)
      .eq('week_start', formattedDate);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching producer assignments:', error);
    return [];
  }
};

// Create a new producer assignment
export const createProducerAssignment = async (assignment: Omit<ProducerAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<ProducerAssignment | null> => {
  try {
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert(assignment)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating producer assignment:', error);
    return null;
  }
};

// Update a producer assignment
export const updateProducerAssignment = async (id: string, updates: Partial<ProducerAssignment>): Promise<ProducerAssignment | null> => {
  try {
    const { data, error } = await supabase
      .from('producer_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating producer assignment:', error);
    return null;
  }
};

// Delete a producer assignment
export const deleteProducerAssignment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('producer_assignments')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting producer assignment:', error);
    return false;
  }
};

// Get or create a work arrangement for a week
export const getOrCreateProducerWorkArrangement = async (weekStart: Date): Promise<ProducerWorkArrangement | null> => {
  try {
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    
    // First try to get an existing arrangement
    const { data, error } = await supabase
      .from('producer_work_arrangements')
      .select('*')
      .eq('week_start', formattedDate)
      .maybeSingle();
      
    if (error) throw error;
    
    // If it exists, return it
    if (data) return data;
    
    // Otherwise create a new one
    const { data: newArrangement, error: createError } = await supabase
      .from('producer_work_arrangements')
      .insert({ week_start: formattedDate })
      .select()
      .single();
      
    if (createError) throw createError;
    return newArrangement;
  } catch (error) {
    console.error('Error getting/creating producer work arrangement:', error);
    return null;
  }
};

// Update work arrangement notes
export const updateProducerWorkArrangementNotes = async (id: string, notes: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('producer_work_arrangements')
      .update({ notes })
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating producer work arrangement notes:', error);
    return false;
  }
};

// Get producers (workers in the production department)
export const getProducers = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .or('department.eq.producers,department.eq.הפקה,department.ilike.%produc%')
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching producers:', error);
    return [];
  }
};

// Get monthly summary for a producer
export const getProducerMonthlyAssignments = async (workerId: string, year: number, month: number): Promise<ProducerAssignment[]> => {
  try {
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:workers (id, name, position),
        slot:schedule_slots (id, day_of_week, start_time, end_time, show_name)
      `)
      .eq('worker_id', workerId)
      .gte('week_start', format(startDate, 'yyyy-MM-dd'))
      .lte('week_start', format(endDate, 'yyyy-MM-dd'));
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching monthly producer assignments:', error);
    return [];
  }
};

// Get all assignments for a month (for summary report)
export const getAllMonthlyAssignments = async (year: number, month: number): Promise<ProducerAssignment[]> => {
  try {
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:workers (id, name, position),
        slot:schedule_slots (id, day_of_week, start_time, end_time, show_name)
      `)
      .gte('week_start', format(startDate, 'yyyy-MM-dd'))
      .lte('week_start', format(endDate, 'yyyy-MM-dd'))
      .order('worker_id');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all monthly assignments:', error);
    return [];
  }
};
