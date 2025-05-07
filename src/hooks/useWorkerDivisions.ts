
import { useState, useEffect, useCallback } from 'react';
import { 
  Division, 
  getDivisions, 
  getWorkerDivisions, 
  assignDivisionToWorker, 
  removeDivisionFromWorker 
} from '@/lib/supabase/divisions';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Mapping of division names to their Hebrew translations
export const DIVISION_TRANSLATIONS: Record<string, string> = {
  'digital': 'דיגיטל',
  'engineers': 'טכנאים',
  'producers': 'עורכים ומפיקים'
};

export const useWorkerDivisions = (workerId?: string) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [workerDivisions, setWorkerDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load available divisions
  const loadDivisions = useCallback(async () => {
    try {
      console.log('useWorkerDivisions: Loading all divisions...');
      setLoading(true);
      const data = await getDivisions();
      console.log(`useWorkerDivisions: Loaded ${data.length} divisions`);
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

  // Load worker's assigned divisions
  const loadWorkerDivisions = useCallback(async () => {
    if (!workerId) {
      setWorkerDivisions([]);
      return [];
    }
    
    try {
      console.log(`useWorkerDivisions: Loading divisions for worker ${workerId}...`);
      setLoading(true);
      const data = await getWorkerDivisions(workerId);
      console.log(`useWorkerDivisions: Loaded ${data.length} divisions for worker ${workerId}:`, data);
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
    const initData = async () => {
      console.log(`useWorkerDivisions: Initializing data for worker ${workerId}`);
      await loadDivisions();
      if (workerId) {
        await loadWorkerDivisions();
      }
    };
    
    initData();
  }, [loadDivisions, loadWorkerDivisions, workerId]);

  const assignDivision = async (divisionId: string) => {
    if (!workerId) return false;
    
    try {
      console.log(`useWorkerDivisions: Assigning division ${divisionId} to worker ${workerId}`);
      const success = await assignDivisionToWorker(workerId, divisionId);
      
      if (success) {
        toast({
          title: "הצלחה",
          description: "המחלקה הוקצתה לעובד בהצלחה",
        });
        
        // Find the assigned division and add it to the worker's divisions
        const assignedDivision = divisions.find(div => div.id === divisionId);
        if (assignedDivision) {
          setWorkerDivisions(prev => [...prev, assignedDivision]);
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
      console.log(`useWorkerDivisions: Removing division ${divisionId} from worker ${workerId}`);
      const success = await removeDivisionFromWorker(workerId, divisionId);
      
      if (success) {
        toast({
          title: "הצלחה",
          description: "המחלקה הוסרה מהעובד בהצלחה",
        });
        
        // Remove the division from the worker's divisions
        setWorkerDivisions(prev => prev.filter(div => div.id !== divisionId));
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
    console.log(`useWorkerDivisions: Refreshing all data for worker ${workerId}`);
    setError(null);
    await loadDivisions();
    if (workerId) {
      await loadWorkerDivisions();
    }
  }, [loadDivisions, loadWorkerDivisions, workerId]);

  return {
    divisions,
    workerDivisions,
    loading,
    error,
    assignDivision,
    removeDivision,
    isDivisionAssigned,
    refreshData,
    getDivisionTranslation: (name: string) => DIVISION_TRANSLATIONS[name.toLowerCase()] || name
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
        
        const { data, error } = await supabase
          .from('worker_divisions')
          .select('worker_id')
          .eq('division_id', divisionId);
          
        if (error) {
          throw error;
        }
        
        console.log(`useFilterWorkersByDivision: Found ${data.length} workers for division ${divisionId}`);
        setWorkers(data.map(item => item.worker_id));
      } catch (err: any) {
        console.error('Error loading workers by division:', err);
        setError(err.message || 'אירעה שגיאה בטעינת עובדים לפי מחלקה');
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
