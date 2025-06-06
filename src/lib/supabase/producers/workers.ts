import { supabase } from "@/lib/supabase";
import { getWorkerDivisions } from "@/lib/supabase/divisions";
import { ensureProducerRoles } from "./roles";

export const getProducers = async () => {
  try {
    console.log('producers/workers.ts: Fetching workers from Supabase...');
    
    // Try to use cached data first
    const cacheKey = 'producers-list';
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp || 0;
        if (Date.now() - cacheTime < 5 * 60 * 1000) { // 5 minutes cache
          console.log('Using cached producers data');
          return parsed.data || [];
        }
      } catch (e) {
        console.error('Error parsing producers cache:', e);
      }
    }
    
    // If cache not valid, fetch from API
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    // Save to cache
    localStorage.setItem(cacheKey, JSON.stringify({
      data: data,
      timestamp: Date.now()
    }));
    
    console.log(`Workers data fetched successfully: ${data?.length} workers`, data);
    return data;
  } catch (error) {
    console.error("Error fetching producers:", error);
    throw error;
  }
};

export const getProducerRoles = async () => {
  try {
    // Ensure all required roles exist before fetching
    await ensureProducerRoles();
    
    // Try to use cached data first
    const cacheKey = 'producer-roles';
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp || 0;
        if (Date.now() - cacheTime < 30 * 60 * 1000) { // 30 minutes cache
          console.log('Using cached producer roles');
          return parsed.data || [];
        }
      } catch (e) {
        console.error('Error parsing roles cache:', e);
      }
    }
    
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    // Save to cache
    localStorage.setItem(cacheKey, JSON.stringify({
      data: data,
      timestamp: Date.now()
    }));
    
    return data;
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};

export const getProducersByDivision = async (divisionId: string) => {
  try {
    console.log(`Getting producers filtered by division ID: ${divisionId}`);
    
    // Check if divisionId is a valid UUID
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(divisionId);
    
    if (!isValidUuid) {
      console.log('Invalid division ID format, falling back to department filter');
      // Fallback to department filter
      const { data: deptWorkers, error: deptError } = await supabase
        .from('workers')
        .select('*')
        .or('department.eq.מפיקים,department.eq.מפיק,department.eq.הפקה,department.eq.producers,department.eq.Production staff')
        .order('name');
        
      if (deptError) throw deptError;
      
      console.log(`Found ${deptWorkers?.length || 0} producers by department filter (fallback)`);
      return deptWorkers || [];
    }
    
    // Try to use cached data first
    const cacheKey = `producers-by-division-${divisionId}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp || 0;
        if (Date.now() - cacheTime < 5 * 60 * 1000) { // 5 minutes cache
          console.log(`Using cached producers for division ${divisionId}, found ${parsed.data?.length || 0} workers`);
          return parsed.data || [];
        }
      } catch (e) {
        console.error('Error parsing producers by division cache:', e);
      }
    }
    
    // Get worker IDs in this division
    const { data: workerDivisions, error: divisionsError } = await supabase
      .from('worker_divisions')
      .select('worker_id')
      .eq('division_id', divisionId);
      
    if (divisionsError) throw divisionsError;
    
    if (!workerDivisions?.length) {
      console.log(`No workers found in division ${divisionId}, trying department filter fallback`);
      // Fallback to department filter if no workers in division
      const { data: deptWorkers, error: deptError } = await supabase
        .from('workers')
        .select('*')
        .or('department.eq.מפיקים,department.eq.מפיק,department.eq.הפקה,department.eq.producers,department.eq.Production staff')
        .order('name');
        
      if (deptError) throw deptError;
      
      console.log(`Found ${deptWorkers?.length || 0} producers by department filter (fallback)`);
      return deptWorkers || [];
    }
    
    const workerIds = workerDivisions.map(wd => wd.worker_id);
    console.log(`Found ${workerIds.length} worker IDs in division ${divisionId}:`, workerIds);
    
    // Get the worker details
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .in('id', workerIds)
      .order('name');
      
    if (workersError) throw workersError;
    
    // Save to cache with a more descriptive key
    localStorage.setItem(cacheKey, JSON.stringify({
      data: workers,
      timestamp: Date.now()
    }));
    
    console.log(`Found ${workers?.length || 0} workers in division ${divisionId}`);
    return workers || [];
  } catch (error) {
    console.error("Error fetching producers by division:", error);
    throw error;
  }
};
