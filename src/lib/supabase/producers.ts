import { supabase } from "@/lib/supabase";

// Export the Worker interface so it can be imported by other modules
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

export interface ProducerRole {
  id: string;
  name: string;
}

export interface CreateProducerUserResult {
  success: boolean;
  password?: string;
  message?: string;
  error?: any;
}

export interface ResetPasswordResult {
  success: boolean;
  password?: string;
  message?: string;
  error?: any;
}

// Define the ProducerAssignment interface
export interface ProducerAssignment {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  notes?: string;
  week_start: string;
  is_recurring: boolean;
  created_at?: string;
  updated_at?: string;
  worker?: Worker;
  slot?: {
    id: string;
    show_name: string;
    host_name?: string | null;
    start_time: string;
    end_time: string;
    day_of_week: number;
    // Add any other properties that might be needed
  };
}

// Define the interface for ProducerWorkArrangement
export interface ProducerWorkArrangement {
  id: string;
  week_start: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const getProducers = async (): Promise<Worker[]> => {
  try {
    console.log('producers.ts: Fetching workers from Supabase...');
    
    // Add a timeout to detect if the request is hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout: Supabase query took too long'));
      }, 10000); // 10 second timeout
    });
    
    // The actual data fetch - include user_id and password_readable
    const fetchPromise = supabase
      .from('workers')
      .select('id, name, department, position, email, phone, user_id, password_readable')
      .order('name');
    
    // Race the fetch against the timeout
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise.then(() => { throw new Error('Timeout'); })
    ]);
    
    if (error) {
      console.error('Error in getWorkers query:', error);
      throw new Error(`Failed to fetch workers: ${error.message}`);
    }
    
    if (!data || !Array.isArray(data)) {
      console.error('No valid data returned from workers query');
      return [];
    }
    
    console.log(`Workers data fetched successfully: ${data.length} workers`);
    
    // Ensure we're returning an array of workers with valid properties
    return data.map(worker => ({
      id: worker.id || '',
      name: worker.name || '',
      department: worker.department || '',
      position: worker.position || '',
      email: worker.email || '',
      phone: worker.phone || '',
      user_id: worker.user_id || undefined,
      password_readable: worker.password_readable || undefined
    }));
  } catch (error) {
    console.error('Error fetching workers:', error);
    throw error; // Re-throw to allow components to handle the error
  }
};

// Function to create a user for a producer
export const createProducerUser = async (
  workerId: string,
  email: string
): Promise<CreateProducerUserResult> => {
  try {
    if (!workerId || !email) {
      console.error('Missing required parameters for createProducerUser');
      return {
        success: false,
        message: 'Missing required parameters'
      };
    }
    
    // Call the edge function directly using supabase.functions.invoke
    console.log("Invoking create-producer-user edge function");
    
    const { data, error } = await supabase.functions.invoke('create-producer-user', {
      body: { workerId, email }
    });
    
    if (error) {
      console.error("Error calling edge function:", error);
      return {
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      };
    }
    
    console.log("Edge function response:", data);
    
    return {
      success: data?.success === true,
      password: data?.password,
      message: data?.message || 'Operation completed'
    };
  } catch (error: any) {
    console.error('Error in createProducerUser:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      error
    };
  }
};

// Function to reset a producer's password
export const resetProducerPassword = async (
  workerId: string
): Promise<ResetPasswordResult> => {
  try {
    if (!workerId) {
      console.error('Missing required workerId for resetProducerPassword');
      return {
        success: false,
        message: 'Missing worker ID'
      };
    }
    
    // Call the edge function using supabase.functions.invoke
    console.log("Invoking reset-producer-password edge function");
    
    const { data, error } = await supabase.functions.invoke('reset-producer-password', {
      body: { workerId }
    });
    
    if (error) {
      console.error("Error calling edge function:", error);
      return {
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      };
    }
    
    console.log("Edge function response:", data);
    
    return {
      success: data?.success === true,
      password: data?.password,
      message: data?.message || 'Operation completed'
    };
  } catch (error: any) {
    console.error('Error in resetProducerPassword:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      error
    };
  }
};

// Get producer roles
export const getProducerRoles = async (): Promise<ProducerRole[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching producer roles:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getProducerRoles:', error);
    throw error;
  }
};

// Get producer assignments for a specific week
export const getProducerAssignments = async (weekStart: Date): Promise<ProducerAssignment[]> => {
  try {
    console.log(`Getting producer assignments for week starting ${weekStart.toISOString().split('T')[0]}`);
    const formattedDate = weekStart.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id(id, name, email, phone, department, position)
      `)
      .eq('week_start', formattedDate);
    
    if (error) {
      console.error('Error fetching producer assignments:', error);
      throw new Error(`Failed to fetch producer assignments: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data as ProducerAssignment[];
  } catch (error) {
    console.error('Error in getProducerAssignments:', error);
    throw error;
  }
};

// Create a new producer assignment
export const createProducerAssignment = async (assignment: Partial<ProducerAssignment>): Promise<ProducerAssignment | null> => {
  try {
    if (!assignment.slot_id || !assignment.worker_id || !assignment.role || !assignment.week_start) {
      throw new Error("Missing required fields for producer assignment");
    }

    // Check if an assignment with this slot, worker, role already exists
    const { data: existingData, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', assignment.slot_id)
      .eq('worker_id', assignment.worker_id)
      .eq('role', assignment.role)
      .eq('week_start', assignment.week_start);

    if (checkError) {
      console.error('Error checking existing assignments:', checkError);
      throw new Error(`Failed to check existing assignments: ${checkError.message}`);
    }

    // If assignment already exists, don't create a duplicate
    if (existingData && existingData.length > 0) {
      console.log('Assignment already exists, not creating duplicate');
      return existingData[0] as ProducerAssignment;
    }

    // Create a properly-typed object for insertion
    const insertData = {
      slot_id: assignment.slot_id,
      worker_id: assignment.worker_id,
      role: assignment.role,
      week_start: assignment.week_start,
      is_recurring: assignment.is_recurring || false,
      notes: assignment.notes
    };

    // Insert the new assignment
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert([insertData])
      .select('*, worker:worker_id(id, name, email, phone, department, position)')
      .single();

    if (error) {
      console.error('Error creating producer assignment:', error);
      throw new Error(`Failed to create producer assignment: ${error.message}`);
    }

    return data as ProducerAssignment;
  } catch (error) {
    console.error('Error in createProducerAssignment:', error);
    throw error;
  }
};

// Create a recurring producer assignment
export const createRecurringProducerAssignment = async (
  slotId: string,
  workerId: string,
  role: string,
  weekStart: string
): Promise<boolean> => {
  try {
    if (!slotId || !workerId || !role || !weekStart) {
      throw new Error("Missing required fields for recurring producer assignment");
    }

    // Create the recurring assignment with proper typing
    const insertData = {
      slot_id: slotId,
      worker_id: workerId,
      role: role,
      week_start: weekStart,
      is_recurring: true
    };

    // Insert the data
    const { error } = await supabase
      .from('producer_assignments')
      .insert([insertData]);

    if (error) {
      console.error('Error creating recurring producer assignment:', error);
      throw new Error(`Failed to create recurring producer assignment: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in createRecurringProducerAssignment:', error);
    return false;
  }
};

// Delete a producer assignment
export const deleteProducerAssignment = async (assignmentId: string): Promise<boolean> => {
  try {
    if (!assignmentId) {
      throw new Error("Missing assignment ID");
    }

    const { error } = await supabase
      .from('producer_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting producer assignment:', error);
      throw new Error(`Failed to delete producer assignment: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProducerAssignment:', error);
    return false;
  }
};

// Get or create a producer work arrangement for a specific week
export const getOrCreateProducerWorkArrangement = async (weekStart: Date): Promise<ProducerWorkArrangement | null> => {
  try {
    const formattedDate = weekStart.toISOString().split('T')[0];
    
    // First try to get an existing arrangement
    const { data: existingData, error: fetchError } = await supabase
      .from('producer_work_arrangements')
      .select('*')
      .eq('week_start', formattedDate)
      .single();
    
    if (!fetchError && existingData) {
      return existingData as ProducerWorkArrangement;
    }
    
    // If it doesn't exist or there was an error, create a new one
    const { data: newData, error: createError } = await supabase
      .from('producer_work_arrangements')
      .insert([{ week_start: formattedDate, notes: '' }])
      .select('*')
      .single();
    
    if (createError) {
      console.error('Error creating producer work arrangement:', createError);
      throw new Error(`Failed to create producer work arrangement: ${createError.message}`);
    }
    
    return newData as ProducerWorkArrangement;
  } catch (error) {
    console.error('Error in getOrCreateProducerWorkArrangement:', error);
    throw error;
  }
};

// Update notes for a producer work arrangement
export const updateProducerWorkArrangementNotes = async (
  arrangementId: string,
  notes: string
): Promise<boolean> => {
  try {
    if (!arrangementId) {
      throw new Error("Missing arrangement ID");
    }
    
    const { error } = await supabase
      .from('producer_work_arrangements')
      .update({ notes })
      .eq('id', arrangementId);
    
    if (error) {
      console.error('Error updating producer work arrangement notes:', error);
      throw new Error(`Failed to update notes: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateProducerWorkArrangementNotes:', error);
    throw error;
  }
};

// Get all monthly assignments for reporting
export const getAllMonthlyAssignments = async (
  month: number,
  year: number
): Promise<ProducerAssignment[]> => {
  try {
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Fetching assignments from ${startDateStr} to ${endDateStr}`);
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id(id, name, email, phone, department, position)
      `)
      .gte('week_start', startDateStr)
      .lte('week_start', endDateStr);
    
    if (error) {
      console.error('Error fetching monthly assignments:', error);
      throw new Error(`Failed to fetch monthly assignments: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllMonthlyAssignments:', error);
    throw error;
  }
};

// Function to assign a producer to a slot
export const assignProducerToSlot = async (
  slotId: string,
  workerId: string, 
  role: string, 
  weekStart: string
): Promise<boolean> => {
  try {
    if (!slotId || !workerId || !role || !weekStart) {
      throw new Error("Missing required fields for producer assignment");
    }

    // Check if an assignment already exists
    const { data: existingData, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', slotId)
      .eq('role', role)
      .eq('week_start', weekStart);

    if (checkError) {
      console.error('Error checking existing assignments:', checkError);
      return false;
    }

    // If assignment exists, update it
    if (existingData && existingData.length > 0) {
      const { error } = await supabase
        .from('producer_assignments')
        .update({ worker_id: workerId })
        .eq('id', existingData[0].id);

      if (error) {
        console.error('Error updating producer assignment:', error);
        return false;
      }
      return true;
    }

    // If not exists, create new assignment
    const { error } = await supabase
      .from('producer_assignments')
      .insert([{
        slot_id: slotId,
        worker_id: workerId,
        role: role,
        week_start: weekStart,
        is_recurring: false
      }]);

    if (error) {
      console.error('Error creating producer assignment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in assignProducerToSlot:', error);
    return false;
  }
};

// Function to remove an assignment
export const removeAssignment = async (assignmentId: string): Promise<boolean> => {
  try {
    if (!assignmentId) {
      throw new Error("Missing assignment ID");
    }

    const { error } = await supabase
      .from('producer_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing producer assignment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeAssignment:', error);
    return false;
  }
};

// Other worker-related functions

export const createWorker = async (worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    if (!worker.name) {
      throw new Error('Worker name is required');
    }

    const { data, error } = await supabase
      .from('workers')
      .insert({
        name: worker.name,
        department: worker.department || null,
        position: worker.position || null,
        email: worker.email || null,
        phone: worker.phone || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating worker:', error);
      return null;
    }
    
    if (!data) {
      console.error('No data returned after creating worker');
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      department: data.department || '',
      position: data.position || '',
      email: data.email || '',
      phone: data.phone || ''
    };
  } catch (error) {
    console.error('Error creating worker:', error);
    return null;
  }
};

export const updateWorker = async (id: string, worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    const updateData: any = {};
    
    if (worker.name) updateData.name = worker.name;
    if (worker.department !== undefined) updateData.department = worker.department;
    if (worker.position !== undefined) updateData.position = worker.position;
    if (worker.email !== undefined) updateData.email = worker.email;
    if (worker.phone !== undefined) updateData.phone = worker.phone;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }
    
    console.log(`Updating worker ${id} with data:`, updateData);
    
    const { data, error } = await supabase
      .from('workers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating worker:', error);
      return null;
    }
    
    if (!data) {
      console.error('No data returned after updating worker');
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      department: data.department || '',
      position: data.position || '',
      email: data.email || '',
      phone: data.phone || ''
    };
  } catch (error) {
    console.error('Error updating worker:', error);
    return null;
  }
};

export const deleteWorker = async (id: string): Promise<boolean> => {
  try {
    console.log(`Deleting worker with ID: ${id}`);
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting worker:', error);
      return false;
    }
    
    console.log(`Worker ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting worker:', error);
    return false;
  }
};

export const getWorkerById = async (id: string): Promise<Worker | null> => {
  try {
    if (!id) {
      console.warn('getWorkerById called with empty id');
      return null;
    }
    
    console.log(`Fetching worker with ID: ${id}`);
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, department, position, email, phone')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching worker with ID ${id}:`, error);
      return null;
    }
    
    if (!data) {
      console.warn(`No worker found with ID ${id}`);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      department: data.department || '',
      position: data.position || '',
      email: data.email || '',
      phone: data.phone || ''
    };
  } catch (error) {
    console.error(`Error fetching worker with ID ${id}:`, error);
    return null;
  }
};

export const getWorkersByIds = async (ids: string[]): Promise<Worker[]> => {
  try {
    if (!ids || ids.length === 0) {
      console.warn('getWorkersByIds called with empty ids array');
      return [];
    }
    
    console.log(`Fetching workers with IDs: ${ids.join(', ')}`);
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, department, position, email, phone')
      .in('id', ids);
    
    if (error) {
      console.error('Error fetching workers by IDs:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn('No workers found for the provided IDs');
      return [];
    }
    
    console.log(`Found ${data.length} workers for ${ids.length} requested IDs`);
    
    return data.map(worker => ({
      id: worker.id,
      name: worker.name,
      department: worker.department || '',
      position: worker.position || '',
      email: worker.email || '',
      phone: worker.phone || ''
    }));
  } catch (error) {
    console.error('Error fetching workers by IDs:', error);
    return [];
  }
};
