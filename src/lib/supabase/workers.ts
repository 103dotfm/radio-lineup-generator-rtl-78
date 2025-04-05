
import { supabase } from "@/lib/supabase";

// Export the Worker interface so it can be imported by other modules
export interface Worker {
  id: string;
  name: string;
  department?: string;
  position?: string;
}

export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, department, position')
      .order('name');
    
    if (error) {
      console.error('Error in getWorkers query:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.error('No valid data returned from workers query');
      return [];
    }
    
    // Ensure we're returning an array of workers with valid properties
    return data.map(worker => ({
      id: worker.id || '',
      name: worker.name || '',
      department: worker.department || '',
      position: worker.position || ''
    }));
  } catch (error) {
    console.error('Error fetching workers:', error);
    return [];
  }
};

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
        position: worker.position || null
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
      position: data.position || ''
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
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }
    
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
      position: data.position || ''
    };
  } catch (error) {
    console.error('Error updating worker:', error);
    return null;
  }
};

export const deleteWorker = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting worker:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting worker:', error);
    return false;
  }
};
