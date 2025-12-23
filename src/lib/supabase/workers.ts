import { api } from '@/lib/api-client';

// Export the Worker interface so it can be imported by other modules
export interface Worker {
  id: string;
  name: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  user_id?: string;
  photo_url?: string;
}

export const getWorkers = async (filter?: { department?: string; division?: string }): Promise<Worker[]> => {
  try {
    console.log('workers.ts: Fetching workers from local API...', filter);
    
    let query = '/workers';
    if (filter && filter.department) {
      query += `?where={"department":"${filter.department}"}`;
    } else if (filter && filter.division) {
      query += `?where={"division":"${filter.division}"}`;
    }
    
    const { data, error } = await api.query(query);
    
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
      photo_url: worker.photo_url || undefined
    }));
  } catch (error) {
    console.error('Error fetching workers:', error);
    throw error; // Re-throw to allow components to handle the error
  }
};

export const createWorker = async (worker: Partial<Worker>): Promise<Worker | null> => {
  try {
    if (!worker.name) {
      throw new Error('Worker name is required');
    }

    const { data, error } = await api.mutate('/workers', {
      name: worker.name,
      department: worker.department || null,
      position: worker.position || null,
      email: worker.email || null,
      phone: worker.phone || null
    }, 'POST');
    
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
    if (worker.photo_url !== undefined) updateData.photo_url = worker.photo_url;
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }
    
    console.log(`Updating worker ${id} with data:`, updateData);
    
    const { data, error } = await api.mutate(`/workers/${id}`, updateData, 'PUT');
    
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
    const { error } = await api.mutate(`/workers/${id}`, {}, 'DELETE');
    
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
    const { data, error } = await api.query(`/workers/${id}`);
    
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
      console.warn('getWorkersByIds called with empty or null ids');
      return [];
    }
    
    console.log(`Fetching workers with IDs: ${ids.join(', ')}`);
    const idList = ids.map(id => `"${id}"`).join(',');
    const query = `/workers?where={"id":{"in":[${idList}]}}`;
    const { data, error } = await api.query(query);
    
    if (error) {
      console.error('Error fetching workers by IDs:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn('No workers found for the given IDs');
      return [];
    }
    
    return data.map(worker => ({
      id: worker.id || '',
      name: worker.name || '',
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

export const getWorkersByDivision = async (divisionId: string): Promise<Worker[]> => {
  try {
    if (!divisionId) {
      console.warn('getWorkersByDivision called with empty divisionId');
      return [];
    }
    
    console.log(`Fetching workers for division ID: ${divisionId}`);
    const query = `/worker-divisions?where={"division_id":"${divisionId}"}`;
    const { data, error } = await api.query(query);
    
    if (error) {
      console.error(`Error fetching worker divisions for division ID ${divisionId}:`, error);
      return [];
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No workers found for division ID ${divisionId}`);
      return [];
    }
    
    const workerIds = data.map(wd => wd.worker_id).filter(id => id);
    if (workerIds.length === 0) {
      console.log(`No valid worker IDs found for division ID ${divisionId}`);
      return [];
    }
    
    return await getWorkersByIds(workerIds);
  } catch (error) {
    console.error(`Error fetching workers for division ID ${divisionId}:`, error);
    return [];
  }
};
