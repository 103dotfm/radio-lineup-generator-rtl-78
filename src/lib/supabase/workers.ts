
import { supabase } from "@/lib/supabase";
import { Worker } from "@/components/schedule/workers/WorkerSelector";

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
      console.error('No data returned or data is not an array');
      return [];
    }
    
    return data.map(worker => ({
      id: worker.id,
      name: worker.name,
      department: worker.department,
      position: worker.position
    }));
  } catch (error) {
    console.error('Error fetching workers:', error);
    return [];
  }
};

export const createWorker = async (worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert({
        name: worker.name,
        department: worker.department,
        position: worker.position
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      department: data.department,
      position: data.position
    };
  } catch (error) {
    console.error('Error creating worker:', error);
    return null;
  }
};

export const updateWorker = async (id: string, worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .update({
        name: worker.name,
        department: worker.department,
        position: worker.position
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      department: data.department,
      position: data.position
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
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting worker:', error);
    return false;
  }
};
