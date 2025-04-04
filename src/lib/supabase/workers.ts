
import { supabase } from "@/lib/supabase";
import { Worker } from "@/components/schedule/workers/WorkerSelector";

export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('digital_employees')
      .select('id, full_name, department, position, email, phone')
      .eq('is_active', true)
      .order('full_name');
    
    if (error) throw error;
    
    return data.map(employee => ({
      id: employee.id,
      name: employee.full_name,
      department: employee.department,
      position: employee.position
    }));
  } catch (error) {
    console.error('Error fetching workers:', error);
    return [];
  }
};

export const createWorker = async (worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('digital_employees')
      .insert({
        full_name: worker.name,
        department: worker.department,
        position: worker.position
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.full_name,
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
      .from('digital_employees')
      .update({
        full_name: worker.name,
        department: worker.department,
        position: worker.position
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.full_name,
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
      .from('digital_employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting worker:', error);
    return false;
  }
};
