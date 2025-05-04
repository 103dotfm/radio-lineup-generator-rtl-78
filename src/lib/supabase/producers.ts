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
    host_name?: string;
  } | null;
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

// Process assignments to handle potential null values in slot property
const processAssignments = (data: any[]): ProducerAssignment[] => {
  return data.filter(assignment => assignment.slot !== null);
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
        slot:schedule_slots_old (id, day_of_week, start_time, end_time, show_name, host_name)
      `)
      .eq('week_start', formattedDate);
      
    if (error) throw error;
    
    // Filter out any assignments with invalid slots
    return processAssignments(data || []);
  } catch (error) {
    console.error('Error fetching producer assignments:', error);
    return [];
  }
};

// Check if a slot exists in schedule_slots_old
const checkSlotExists = async (slotId: string): Promise<boolean> => {
  try {
    // Check schedule_slots_old
    const { data, error } = await supabase
      .from('schedule_slots_old')
      .select('id')
      .eq('id', slotId)
      .maybeSingle();
      
    if (!error && data) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking slot existence:", error);
    return false;
  }
};

// Fetch slot details from schedule_slots_old
const fetchSlotDetails = async (slotId: string) => {
  try {
    // Try schedule_slots_old
    const { data, error } = await supabase
      .from('schedule_slots_old')
      .select('day_of_week, start_time, end_time, show_name, host_name')
      .eq('id', slotId)
      .maybeSingle();
      
    if (!error && data) {
      return { found: true, data };
    }
    
    return { found: false, data: null };
  } catch (error) {
    console.error("Error in fetchSlotDetails:", error);
    return { found: false, data: null, error };
  }
};

// Create a new producer assignment
export const createProducerAssignment = async (assignment: Omit<ProducerAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<ProducerAssignment | null> => {
  try {
    console.log("Creating assignment:", assignment);
    
    // First check if this assignment already exists to prevent duplicate
    const { data: existingAssignment, error: checkError } = await supabase
      .from('producer_assignments')
      .select('id')
      .eq('slot_id', assignment.slot_id)
      .eq('worker_id', assignment.worker_id)
      .eq('role', assignment.role)
      .eq('week_start', assignment.week_start)
      .maybeSingle();
    
    if (!checkError && existingAssignment) {
      console.log("Assignment already exists:", existingAssignment);
      return null; // Assignment already exists
    }
    
    // Then, check if the slot exists
    const slotExists = await checkSlotExists(assignment.slot_id);
    
    if (!slotExists) {
      console.error("Error: Schedule slot not found:", assignment.slot_id);
      throw new Error(`Schedule slot with ID ${assignment.slot_id} not found`);
    }
    
    // Insert the assignment
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert(assignment)
      .select()
      .single();
      
    if (error) {
      console.error("Error creating producer assignment:", error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating producer assignment:', error);
    return null;
  }
};

// Create recurring producer assignments for all instances of a show
export const createRecurringProducerAssignment = async (
  slotId: string,
  workerId: string,
  role: string,
  weekStart: string
): Promise<boolean> => {
  try {
    // First get the slot details to find day and time
    const slotResult = await fetchSlotDetails(slotId);
    
    if (!slotResult.found) {
      console.error("Slot not found for ID:", slotId);
      throw new Error(`Slot with ID ${slotId} not found`);
    }
    
    const slotData = slotResult.data;
    
    console.log("Creating recurring assignment with slot data:", slotData);
    
    // Find all slots with matching day, time and show name
    const { data: matchingSlots, error: slotsError } = await supabase
      .from('schedule_slots_old')
      .select('id')
      .eq('day_of_week', slotData.day_of_week)
      .eq('start_time', slotData.start_time)
      .eq('end_time', slotData.end_time)
      .eq('show_name', slotData.show_name)
      .or('is_recurring.eq.true,is_recurring.is.null');
    
    if (slotsError) {
      console.error("Error finding matching slots:", slotsError);
      throw slotsError;
    }
    
    console.log("Found matching slots:", matchingSlots?.length);
    
    if (!matchingSlots || matchingSlots.length === 0) {
      console.error("No matching slots found for pattern:", {
        day_of_week: slotData.day_of_week,
        start_time: slotData.start_time,
        end_time: slotData.end_time,
        show_name: slotData.show_name
      });
      throw new Error("No matching slots found");
    }
    
    // Create assignments for each matching slot
    let successCount = 0;
    
    for (const slot of matchingSlots) {
      // Check if this assignment already exists
      const { data: existingAssignment } = await supabase
        .from('producer_assignments')
        .select('id')
        .eq('slot_id', slot.id)
        .eq('worker_id', workerId)
        .eq('role', role)
        .eq('week_start', weekStart)
        .maybeSingle();
        
      if (!existingAssignment) {
        // Only insert if not exists
        console.log("Creating recurring assignment for slot:", slot.id);
        const { error } = await supabase
          .from('producer_assignments')
          .insert({
            slot_id: slot.id,
            worker_id: workerId,
            role,
            week_start: weekStart,
            is_recurring: true
          });
          
        if (!error) {
          successCount++;
        } else {
          console.error("Error creating recurring assignment:", error);
        }
      }
    }
    
    return successCount > 0;
  } catch (error) {
    console.error('Error creating recurring producer assignments:', error);
    return false;
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
        slot:schedule_slots_old (id, day_of_week, start_time, end_time, show_name)
      `)
      .eq('worker_id', workerId)
      .gte('week_start', format(startDate, 'yyyy-MM-dd'))
      .lte('week_start', format(endDate, 'yyyy-MM-dd'));
      
    if (error) throw error;
    
    // Filter out any assignments with invalid slots
    return processAssignments(data || []);
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
        slot:schedule_slots_old (id, day_of_week, start_time, end_time, show_name)
      `)
      .gte('week_start', format(startDate, 'yyyy-MM-dd'))
      .lte('week_start', format(endDate, 'yyyy-MM-dd'))
      .order('worker_id');
      
    if (error) throw error;
    
    // Filter out any assignments with invalid slots
    return processAssignments(data || []);
  } catch (error) {
    console.error('Error fetching all monthly assignments:', error);
    return [];
  }
};
