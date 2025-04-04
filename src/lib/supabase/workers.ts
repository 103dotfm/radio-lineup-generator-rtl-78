
import { supabase } from '@/lib/supabase';
import { Worker } from '@/components/schedule/workers/WorkerSelector';

// Get all workers
export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching workers:', error);
    return [];
  }
};

// Create a new worker
export const createWorker = async (worker: Omit<Worker, 'id'>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert(worker)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating worker:', error);
    return null;
  }
};

// Update a worker
export const updateWorker = async (id: string, worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    const { data, error } = await supabase
      .from('workers')
      .update(worker)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating worker:', error);
    return null;
  }
};

// Delete a worker
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
