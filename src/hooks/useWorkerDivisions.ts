
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
      setLoading(true);
      const data = await getDivisions();
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
      setLoading(true);
      const data = await getWorkerDivisions(workerId);
      console.log(`Loaded ${data.length} divisions for worker ${workerId}:`, data);
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
      await loadDivisions();
      await loadWorkerDivisions();
    };
    
    initData();
  }, [loadDivisions, loadWorkerDivisions]);

  const assignDivision = async (divisionId: string) => {
    if (!workerId) return false;
    
    try {
      const success = await assignDivisionToWorker(workerId, divisionId);
      
      if (success) {
        // Refresh worker divisions immediately after successful assignment
        await loadWorkerDivisions();
        toast({
          title: "הצלחה",
          description: "המחלקה הוקצתה לעובד בהצלחה",
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
      const success = await removeDivisionFromWorker(workerId, divisionId);
      
      if (success) {
        // Refresh worker divisions immediately after successful removal
        await loadWorkerDivisions();
        toast({
          title: "הצלחה",
          description: "המחלקה הוסרה מהעובד בהצלחה",
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
    await loadDivisions();
    await loadWorkerDivisions();
  }, [loadDivisions, loadWorkerDivisions]);

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
        setLoading(true);
        
        const { data, error } = await supabase
          .from('worker_divisions')
          .select('worker_id')
          .eq('division_id', divisionId);
          
        if (error) {
          throw error;
        }
        
        console.log(`Found ${data.length} workers for division ${divisionId}:`, data);
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
