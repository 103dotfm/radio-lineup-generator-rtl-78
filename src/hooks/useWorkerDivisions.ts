
import { useState, useEffect } from 'react';
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
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        setLoading(true);
        const data = await getDivisions();
        setDivisions(data);
      } catch (err) {
        console.error('Error loading divisions:', err);
        setError('Error loading divisions');
      } finally {
        setLoading(false);
      }
    };

    loadDivisions();
  }, []);

  // Load worker's assigned divisions when workerId changes
  useEffect(() => {
    const loadWorkerDivisions = async () => {
      if (!workerId) {
        setWorkerDivisions([]);
        return;
      }
      
      try {
        setLoading(true);
        const data = await getWorkerDivisions(workerId);
        setWorkerDivisions(data);
      } catch (err) {
        console.error('Error loading worker divisions:', err);
        setError('Error loading worker divisions');
      } finally {
        setLoading(false);
      }
    };

    loadWorkerDivisions();
  }, [workerId]);

  const assignDivision = async (divisionId: string) => {
    if (!workerId) return false;
    
    try {
      const success = await assignDivisionToWorker(workerId, divisionId);
      
      if (success) {
        // Refresh worker divisions
        const updatedDivisions = await getWorkerDivisions(workerId);
        setWorkerDivisions(updatedDivisions);
      }
      
      return success;
    } catch (err) {
      console.error('Error assigning division:', err);
      return false;
    }
  };

  const removeDivision = async (divisionId: string) => {
    if (!workerId) return false;
    
    try {
      const success = await removeDivisionFromWorker(workerId, divisionId);
      
      if (success) {
        // Update local state by filtering out the removed division
        setWorkerDivisions(prev => prev.filter(div => div.id !== divisionId));
      }
      
      return success;
    } catch (err) {
      console.error('Error removing division:', err);
      return false;
    }
  };

  const isDivisionAssigned = (divisionId: string) => {
    return workerDivisions.some(div => div.id === divisionId);
  };

  return {
    divisions,
    workerDivisions,
    loading,
    error,
    assignDivision,
    removeDivision,
    isDivisionAssigned,
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
