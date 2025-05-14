import { supabase } from "@/lib/supabase";
import { ShiftWorker } from '@/types/schedule';

// Export the Worker interface so it can be imported by other modules
export interface Worker extends ShiftWorker {}

export const getWorkers = async (): Promise<ShiftWorker[]> => {
  try {
    console.log('workers.ts: Fetching workers from Supabase...');
    
    // Add a timeout to detect if the request is hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout: Supabase query took too long'));
      }, 10000); // 10 second timeout
    });
    
    // The actual data fetch - include user_id, password_readable and photo_url
    const fetchPromise = supabase
      .from('workers')
      .select('id, name, department, position, email, phone, user_id, password_readable, photo_url')
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
      password_readable: worker.password_readable || undefined,
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
    if (worker.photo_url !== undefined) updateData.photo_url = worker.photo_url;
    
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
