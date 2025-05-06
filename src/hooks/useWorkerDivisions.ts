
import { useState, useEffect } from 'react';
import { 
  Division, 
  getDivisions, 
  getWorkerDivisions, 
  assignDivisionToWorker, 
  removeDivisionFromWorker 
} from '@/lib/supabase/divisions';
import { useToast } from "@/hooks/use-toast";

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
        
        toast({
          title: "הצלחה",
          description: "המחלקה הוקצתה לעובד בהצלחה",
        });
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
      const success = await removeDivisionFromWorker(workerId, divisionId);
      
      if (success) {
        // Update local state by filtering out the removed division
        setWorkerDivisions(prev => prev.filter(div => div.id !== divisionId));
        
        toast({
          title: "הצלחה",
          description: "המחלקה הוסרה מהעובד בהצלחה",
        });
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
