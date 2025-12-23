import { api } from "@/lib/api-client";

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
      const { data, error } = await api.query('/divisions', {
        where: { name: div.name },
        limit: 1
      });
      
      if (error) {
        console.error(`Error checking division ${div.name}:`, error);
        continue;
      }
      
      // If division doesn't exist, create it
      if (!data || data.length === 0) {
        console.log(`Creating standard division: ${div.name}`);
        await api.mutate('/divisions', div, 'POST');
      }
    }
    
    console.log('Standard divisions check completed');
  } catch (error) {
    console.error('Error ensuring standard divisions:', error);
  }
};

export const getDivisions = async (): Promise<Division[]> => {
  try {
    console.log('Fetching divisions...');
    
    // Ensure standard divisions exist before fetching
    await ensureStandardDivisions();
    
    const { data, error } = await api.query('/divisions', {
      order: { name: 'asc' }
    });
    
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
    
    // First get the division IDs for this worker
    const { data: workerDivisions, error: workerDivisionsError } = await api.query('/worker-divisions', {
      where: { worker_id: workerId },
      select: 'division_id'
    });
    
    if (workerDivisionsError) {
      console.error('Error fetching worker divisions:', workerDivisionsError);
      throw new Error(`Failed to fetch worker divisions: ${workerDivisionsError.message}`);
    }
    
    if (!workerDivisions || workerDivisions.length === 0) {
      return [];
    }
    
    // Then get the division details
    const divisionIds = workerDivisions.map(wd => wd.division_id);
    const { data: divisions, error: divisionsError } = await api.query('/divisions', {
      where: { id: { in: divisionIds } }
    });
    
    if (divisionsError) {
      console.error('Error fetching divisions:', divisionsError);
      throw new Error(`Failed to fetch divisions: ${divisionsError.message}`);
    }
    
    console.log(`Retrieved ${divisions?.length || 0} divisions for worker ${workerId}:`, divisions);
    return divisions || [];
  } catch (error) {
    console.error('Error in getWorkerDivisions:', error);
    throw error;
  }
};

export const getWorkersByDivisionId = async (divisionId: string): Promise<string[]> => {
  try {
    console.log(`Fetching workers for division ID: ${divisionId}`);
    
    const { data, error } = await api.query('/worker-divisions', {
      where: { division_id: divisionId },
      select: 'worker_id'
    });
    
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
    const { data: divisions, error: divisionError } = await api.query('/divisions', {
      where: { id: divisionId },
      limit: 1
    });
    
    if (divisionError || !divisions || divisions.length === 0) {
      console.error('Error validating division:', divisionError || 'Division not found');
      return false;
    }
    
    // Check if the assignment already exists to avoid duplicate entries
    const { data: existingData, error: checkError } = await api.query('/worker-divisions', {
      where: {
        worker_id: workerId,
        division_id: divisionId
      },
      limit: 1
    });
      
    if (checkError) {
      console.error('Error checking existing assignment:', checkError);
      return false;
    }
    
    // If already assigned, return success without inserting
    if (existingData && existingData.length > 0) {
      console.log('Division is already assigned to this worker');
      return true;
    }
    
    // Then insert the worker-division relationship
    console.log(`Inserting new worker_divisions record: worker_id=${workerId}, division_id=${divisionId}`);
    const { data, error } = await api.mutate('/worker-divisions', {
      worker_id: workerId,
      division_id: divisionId
    }, 'POST');
    
    if (error) {
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
    
    const { error } = await api.mutate(`/worker-divisions?worker_id=${workerId}&division_id=${divisionId}`, {}, 'DELETE');
    
    if (error) {
      console.error('Error removing division from worker:', error);
      return false;
    }
    
    console.log('Division removed successfully');
    return true;
  } catch (error) {
    console.error('Error in removeDivisionFromWorker:', error);
    return false;
  }
};
