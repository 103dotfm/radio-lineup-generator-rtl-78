import { api } from "@/lib/api-client";
import { getWorkerDivisions } from "@/lib/supabase/divisions";
import { ensureProducerRoles } from "./roles";

export const getProducers = async () => {
  try {
    
    // Try to use cached data first
    const cacheKey = 'producers-list';
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp || 0;
        if (Date.now() - cacheTime < 5 * 60 * 1000) { // 5 minutes cache
          return parsed.data || [];
        }
      } catch (e) {
        console.error('Error parsing producers cache:', e);
      }
    }
    
    // If cache not valid, fetch from API
    const { data, error } = await api.query('/workers', {
      order: { name: 'asc' }
    });
      
    if (error) throw error;
    
    // Save to cache
    localStorage.setItem(cacheKey, JSON.stringify({
      data: data,
      timestamp: Date.now()
    }));
    
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
          return parsed.data || [];
        }
      } catch (e) {
        console.error('Error parsing roles cache:', e);
      }
    }
    
    const { data, error } = await api.query('/producer-roles', {
      order: { name: 'asc' }
    });
      
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
    
    // Check if divisionId is a valid UUID
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(divisionId);
    
    if (!isValidUuid) {
      // Fallback to department filter using OR conditions in where clause
      const { data: deptWorkers, error: deptError } = await api.query('/workers', {
        where: {
          department: {
            in: ['מפיקים', 'מפיק', 'הפקה', 'producers', 'Production staff']
          }
        },
        order: { name: 'asc' }
      });
        
      if (deptError) throw deptError;
      
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
          return parsed.data || [];
        }
      } catch (e) {
        console.error('Error parsing producers by division cache:', e);
      }
    }
    
    // Get worker IDs in this division
    const { data: workerDivisions, error: divisionsError } = await api.query('/worker-divisions', {
      where: { division_id: divisionId },
      select: 'worker_id'
    });
      
    if (divisionsError) throw divisionsError;
    
    if (!workerDivisions?.length) {
      // Fallback to department filter using OR conditions in where clause
      const { data: deptWorkers, error: deptError } = await api.query('/workers', {
        where: {
          department: {
            in: ['מפיקים', 'מפיק', 'הפקה', 'producers', 'Production staff']
          }
        },
        order: { name: 'asc' }
      });
        
      if (deptError) throw deptError;
      
      return deptWorkers || [];
    }
    
    const workerIds = workerDivisions.map(wd => wd.worker_id);
    
    // Get the worker details
    const { data: workers, error: workersError } = await api.query('/workers', {
      where: { id: { in: workerIds } },
      order: { name: 'asc' }
    });
      
    if (workersError) throw workersError;
    
    // Save to cache with a more descriptive key
    localStorage.setItem(cacheKey, JSON.stringify({
      data: workers,
      timestamp: Date.now()
    }));
    
    return workers || [];
  } catch (error) {
    console.error("Error fetching producers by division:", error);
    throw error;
  }
};
