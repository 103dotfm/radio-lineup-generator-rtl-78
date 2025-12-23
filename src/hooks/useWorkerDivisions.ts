import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Division, 
  getDivisions, 
  getWorkerDivisions, 
  assignDivisionToWorker, 
  removeDivisionFromWorker 
} from '@/lib/supabase/divisions';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api-client";

// Cache for divisions to prevent redundant API calls
const divisionsCache: {
  allDivisions: Division[] | null;
  workerDivisions: Record<string, Division[]>;
  timestamp: number;
} = {
  allDivisions: null,
  workerDivisions: {},
  timestamp: 0
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Mapping of division names to their Hebrew translations
export const DIVISION_TRANSLATIONS: Record<string, string> = {
  'digital': 'דיגיטל',
  'engineers': 'טכנאים',
  'producers': 'עורכים ומפיקים',
  'מפיקים': 'מפיקים',
  'מפיק': 'מפיק',
  'הפקה': 'הפקה',
  'Production staff': 'צוות הפקה'
};

export const useWorkerDivisions = (workerId?: string) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [workerDivisions, setWorkerDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const initialLoadDone = useRef(false);

  // Check if cache is valid
  const isCacheValid = () => {
    return (
      divisionsCache.allDivisions !== null &&
      Date.now() - divisionsCache.timestamp < CACHE_EXPIRATION
    );
  };

  // Load available divisions with cache
  const loadDivisions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use cached divisions if available and not expired
      if (isCacheValid()) {
        console.log('Using cached divisions data');
        setDivisions(divisionsCache.allDivisions || []);
        return divisionsCache.allDivisions || [];
      }

      console.log('Fetching divisions from Supabase...');
      const data = await getDivisions();
      
      // Update cache
      divisionsCache.allDivisions = data;
      divisionsCache.timestamp = Date.now();
      
      setDivisions(data);
      return data;
    } catch (err) {
      console.error('Error loading divisions:', err);
      setError('Error loading divisions');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load worker's assigned divisions with cache
  const loadWorkerDivisions = useCallback(async () => {
    if (!workerId) {
      setWorkerDivisions([]);
      return [];
    }
    
    try {
      setLoading(true);
      
      // Use cached worker divisions if available
      if (divisionsCache.workerDivisions[workerId] && isCacheValid()) {
        console.log(`Using cached divisions for worker ${workerId}`);
        setWorkerDivisions(divisionsCache.workerDivisions[workerId]);
        return divisionsCache.workerDivisions[workerId];
      }
      
      console.log(`Fetching divisions for worker ID: ${workerId}`);
      const data = await getWorkerDivisions(workerId);
      
      // Update cache
      divisionsCache.workerDivisions[workerId] = data;
      
      setWorkerDivisions(data);
      return data;
    } catch (err) {
      console.error('Error loading worker divisions:', err);
      setError('Error loading worker divisions');
      return [];
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  // Initial data loading
  useEffect(() => {
    if (initialLoadDone.current && workerId) return;
    
    const initData = async () => {
      await loadDivisions();
      if (workerId) {
        await loadWorkerDivisions();
        initialLoadDone.current = true;
      }
    };
    
    initData();
  }, [loadDivisions, loadWorkerDivisions, workerId]);

  const assignDivision = async (divisionId: string) => {
    if (!workerId) return false;
    
    try {
      console.log(`Assigning division ${divisionId} to worker ${workerId}`);
      const success = await assignDivisionToWorker(workerId, divisionId);
      
      if (success) {
        toast({
          title: "הצלחה",
          description: "המחלקה הוקצתה לעובד בהצלחה",
        });
        
        // Update local state directly without fetching again
        const divToAdd = divisionsCache.allDivisions?.find(d => d.id === divisionId);
        if (divToAdd) {
          const updatedDivisions = [...workerDivisions, divToAdd];
          setWorkerDivisions(updatedDivisions);
          
          // Update cache
          divisionsCache.workerDivisions[workerId] = updatedDivisions;
        } else {
          // Fallback if division not found in cache
          await loadWorkerDivisions();
        }
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהקצאת המחלקה",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (err) {
      console.error('Error assigning division:', err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהקצאת המחלקה",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeDivision = async (divisionId: string) => {
    if (!workerId) return false;
    
    try {
      console.log(`Removing division ${divisionId} from worker ${workerId}`);
      const success = await removeDivisionFromWorker(workerId, divisionId);
      
      if (success) {
        toast({
          title: "הצלחה",
          description: "המחלקה הוסרה מהעובד בהצלחה",
        });
        
        // Update local state directly without fetching again
        const updatedDivisions = workerDivisions.filter(div => div.id !== divisionId);
        setWorkerDivisions(updatedDivisions);
        
        // Update cache
        divisionsCache.workerDivisions[workerId] = updatedDivisions;
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהסרת המחלקה",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (err) {
      console.error('Error removing division:', err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת המחלקה",
        variant: "destructive",
      });
      return false;
    }
  };

  const isDivisionAssigned = (divisionId: string) => {
    return workerDivisions.some(div => div.id === divisionId);
  };

  const refreshData = useCallback(async () => {
    console.log(`Refreshing data for worker ${workerId}`);
    setError(null);
    
    // Invalidate cache for this worker
    if (workerId) {
      delete divisionsCache.workerDivisions[workerId];
    }
    
    await loadDivisions();
    if (workerId) {
      await loadWorkerDivisions();
    }
  }, [loadDivisions, loadWorkerDivisions, workerId]);

  const getDivisionTranslation = (name: string) => {
    return DIVISION_TRANSLATIONS[name.toLowerCase()] || 
           DIVISION_TRANSLATIONS[name] || 
           name;
  };

  return {
    divisions,
    workerDivisions,
    loading,
    error,
    assignDivision,
    removeDivision,
    isDivisionAssigned,
    refreshData,
    getDivisionTranslation
  };
};

// Hook for filtering workers by division
export const useFilterWorkersByDivision = (divisionId?: string) => {
  const [workers, setWorkers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkersByDivision = async () => {
      if (!divisionId) {
        setWorkers([]);
        setLoading(false);
        return;
      }
      
      try {
        console.log(`useFilterWorkersByDivision: Loading workers for division ${divisionId}`);
        setLoading(true);
        
        // First, get the division name to map to department
        const { data: divisionData, error: divisionError } = await api.query('/divisions', {
          where: { id: divisionId }
        });
        
        if (divisionError) {
          throw divisionError;
        }
        
        const division = divisionData?.[0];
        if (!division) {
          console.log('Division not found');
          setWorkers([]);
          return;
        }
        
        console.log(`useFilterWorkersByDivision: Found division: ${division.name}`);
        
        // Map division name to department patterns
        const departmentPatterns = [];
        if (division.name.toLowerCase().includes('producers') || 
            division.name.toLowerCase().includes('מפיקים') ||
            division.name.toLowerCase().includes('הפקה')) {
          departmentPatterns.push('producers', 'מפיקים', 'הפקה', 'Production staff');
          console.log(`useFilterWorkersByDivision: Found producers division, using patterns:`, departmentPatterns);
        } else if (division.name.toLowerCase().includes('engineers') || 
                   division.name.toLowerCase().includes('טכנאים') ||
                   division.name.toLowerCase().includes('טכני')) {
          departmentPatterns.push('engineers', 'טכנאים', 'טכני', 'Engineering staff');
          console.log(`useFilterWorkersByDivision: Found engineers division, using patterns:`, departmentPatterns);
        } else {
          console.log(`useFilterWorkersByDivision: Unknown division type: ${division.name}`);
        }
        
        // Get workers by department
        let departmentWorkers: string[] = [];
        if (departmentPatterns.length > 0) {
          const { data: workersData, error: workersError } = await api.query('/workers', {
            where: { 
              or: departmentPatterns.map(pattern => ({ 'department ILIKE': `%${pattern}%` }))
            },
            select: 'id, name, department'
          });
          
          if (workersError) {
            throw workersError;
          }
          
          if (workersData && Array.isArray(workersData)) {
            departmentWorkers = workersData.map(worker => worker.id);
            console.log(`useFilterWorkersByDivision: Found ${departmentWorkers.length} workers by department:`, workersData.map(w => ({ id: w.id, name: w.name, department: w.department })));
          }
        }
        
        // Also get workers from worker-divisions table
        const { data, error } = await api.query('/worker-divisions', {
          where: { division_id: divisionId },
          select: 'worker_id'
        });
          
        if (error) {
          throw error;
        }
        
        let divisionWorkers: string[] = [];
        if (data && Array.isArray(data)) {
          divisionWorkers = data.map(item => item.worker_id);
          console.log(`useFilterWorkersByDivision: Found ${divisionWorkers.length} workers by division assignment:`, divisionWorkers);
        }
        
        // Combine both lists and remove duplicates
        const allWorkers = [...new Set([...departmentWorkers, ...divisionWorkers])];
        console.log(`useFilterWorkersByDivision: Total unique workers: ${allWorkers.length}`);
        setWorkers(allWorkers);
      } catch (err: any) {
        console.error('Error loading workers by division:', err);
        setError(err.message || 'אירעה שגיאה בטעינת עובדים לפי מחלקה');
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkersByDivision();
  }, [divisionId]);

  return {
    workerIds: workers,
    loading,
    error
  };
};
