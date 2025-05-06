
import { supabase } from "@/lib/supabase";
import { Worker } from "./workers";

export interface Division {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const getDivisions = async (): Promise<Division[]> => {
  try {
    console.log('Fetching divisions from Supabase...');
    
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching divisions:', error);
      throw new Error(`Failed to fetch divisions: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getDivisions:', error);
    throw error;
  }
};

export const getWorkerDivisions = async (workerId: string): Promise<Division[]> => {
  try {
    const { data, error } = await supabase
      .from('worker_divisions')
      .select(`
        division_id,
        divisions:division_id (*)
      `)
      .eq('worker_id', workerId);
    
    if (error) {
      console.error('Error fetching worker divisions:', error);
      throw new Error(`Failed to fetch worker divisions: ${error.message}`);
    }
    
    return data?.map(item => item.divisions) || [];
  } catch (error) {
    console.error('Error in getWorkerDivisions:', error);
    throw error;
  }
};

export const getWorkersByDivisionId = async (divisionId: string): Promise<Worker[]> => {
  try {
    console.log(`Fetching workers for division ID: ${divisionId}`);
    
    // Get the worker IDs for the given division
    const { data: workerDivisions, error: divisionError } = await supabase
      .from('worker_divisions')
      .select('worker_id')
      .eq('division_id', divisionId);
    
    if (divisionError) {
      console.error('Error fetching worker divisions:', divisionError);
      throw new Error(`Failed to fetch worker divisions: ${divisionError.message}`);
    }
    
    if (!workerDivisions || workerDivisions.length === 0) {
      console.log(`No workers found for division ID: ${divisionId}`);
      return [];
    }
    
    // Extract worker IDs
    const workerIds = workerDivisions.map(wd => wd.worker_id);
    console.log(`Found ${workerIds.length} worker IDs for division ID: ${divisionId}`);
    
    // Fetch the worker details
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, department, position, email, phone, user_id, password_readable, photo_url')
      .in('id', workerIds);
    
    if (workersError) {
      console.error('Error fetching workers:', workersError);
      throw new Error(`Failed to fetch workers: ${workersError.message}`);
    }
    
    console.log(`Fetched ${workers?.length || 0} workers for division ID: ${divisionId}`);
    
    return workers || [];
  } catch (error) {
    console.error(`Error in getWorkersByDivisionId for division ${divisionId}:`, error);
    return [];
  }
};

export const assignDivisionToWorker = async (workerId: string, divisionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('worker_divisions')
      .insert({ worker_id: workerId, division_id: divisionId });
    
    if (error) {
      // If the error is because the relationship already exists, return true
      if (error.code === '23505') { // Unique violation
        return true;
      }
      console.error('Error assigning division to worker:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in assignDivisionToWorker:', error);
    return false;
  }
};

export const removeDivisionFromWorker = async (workerId: string, divisionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('worker_divisions')
      .delete()
      .match({ worker_id: workerId, division_id: divisionId });
    
    if (error) {
      console.error('Error removing division from worker:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeDivisionFromWorker:', error);
    return false;
  }
};
