
import { supabase } from "@/lib/supabase";

export interface Division {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Function to ensure standard divisions exist
export const ensureStandardDivisions = async (): Promise<void> => {
  const standardDivisions = [
    { name: 'digital', description: 'Digital department' },
    { name: 'engineers', description: 'Technical staff' },
    { name: 'producers', description: 'Production and editing staff' }
  ];
  
  try {
    console.log('Checking for standard divisions...');
    
    for (const div of standardDivisions) {
      // Check if division exists
      const { data, error } = await supabase
        .from('divisions')
        .select('id')
        .eq('name', div.name)
        .maybeSingle();
      
      if (error) {
        console.error(`Error checking division ${div.name}:`, error);
        continue;
      }
      
      // If division doesn't exist, create it
      if (!data) {
        console.log(`Creating standard division: ${div.name}`);
        await supabase
          .from('divisions')
          .insert(div);
      }
    }
    
    console.log('Standard divisions check completed');
  } catch (error) {
    console.error('Error ensuring standard divisions:', error);
  }
};

export const getDivisions = async (): Promise<Division[]> => {
  try {
    console.log('Fetching divisions from Supabase...');
    
    // Ensure standard divisions exist before fetching
    await ensureStandardDivisions();
    
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching divisions:', error);
      throw new Error(`Failed to fetch divisions: ${error.message}`);
    }
    
    console.log(`Retrieved ${data?.length || 0} divisions:`, data);
    return data || [];
  } catch (error) {
    console.error('Error in getDivisions:', error);
    throw error;
  }
};

export const getWorkerDivisions = async (workerId: string): Promise<Division[]> => {
  try {
    console.log(`Fetching divisions for worker ID: ${workerId}`);
    
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
    
    const divisions = data?.map(item => item.divisions) || [];
    console.log(`Retrieved ${divisions.length} divisions for worker ${workerId}:`, divisions);
    return divisions;
  } catch (error) {
    console.error('Error in getWorkerDivisions:', error);
    throw error;
  }
};

export const getWorkersByDivisionId = async (divisionId: string): Promise<string[]> => {
  try {
    console.log(`Fetching workers for division ID: ${divisionId}`);
    
    const { data, error } = await supabase
      .from('worker_divisions')
      .select('worker_id')
      .eq('division_id', divisionId);
    
    if (error) {
      console.error('Error fetching workers by division:', error);
      throw new Error(`Failed to fetch workers by division: ${error.message}`);
    }
    
    const workerIds = data?.map(item => item.worker_id) || [];
    console.log(`Found ${workerIds.length} workers for division ${divisionId}`);
    return workerIds;
  } catch (error) {
    console.error('Error in getWorkersByDivisionId:', error);
    throw error;
  }
};

export const assignDivisionToWorker = async (workerId: string, divisionId: string): Promise<boolean> => {
  try {
    console.log(`Assigning division ${divisionId} to worker ${workerId}`);
    
    // First, validate that the division exists
    const { data: divisionData, error: divisionError } = await supabase
      .from('divisions')
      .select('id')
      .eq('id', divisionId)
      .maybeSingle();
    
    if (divisionError || !divisionData) {
      console.error('Error validating division:', divisionError || 'Division not found');
      return false;
    }
    
    // Check if the assignment already exists to avoid duplicate entries
    const { data: existingData, error: checkError } = await supabase
      .from('worker_divisions')
      .select('id')
      .eq('worker_id', workerId)
      .eq('division_id', divisionId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking existing assignment:', checkError);
      return false;
    }
    
    // If already assigned, return success without inserting
    if (existingData) {
      console.log('Division is already assigned to this worker');
      return true;
    }
    
    // Then insert the worker-division relationship
    console.log(`Inserting new worker_divisions record: worker_id=${workerId}, division_id=${divisionId}`);
    const { data, error } = await supabase
      .from('worker_divisions')
      .insert({ worker_id: workerId, division_id: divisionId })
      .select();
    
    if (error) {
      // If the error is because the relationship already exists, return true
      if (error.code === '23505') { // Unique violation
        console.log('This division is already assigned to the worker');
        return true;
      }
      console.error('Error assigning division to worker:', error);
      return false;
    }
    
    console.log('Division assigned successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in assignDivisionToWorker:', error);
    return false;
  }
};

export const removeDivisionFromWorker = async (workerId: string, divisionId: string): Promise<boolean> => {
  try {
    console.log(`Removing division ${divisionId} from worker ${workerId}`);
    
    const { data, error } = await supabase
      .from('worker_divisions')
      .delete()
      .match({ worker_id: workerId, division_id: divisionId })
      .select();
    
    if (error) {
      console.error('Error removing division from worker:', error);
      return false;
    }
    
    console.log('Division removed successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in removeDivisionFromWorker:', error);
    return false;
  }
};
