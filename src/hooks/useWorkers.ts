
import { useState, useEffect } from 'react';
import { ShiftWorker } from '@/types/schedule';
import { getWorkers } from '@/lib/supabase/workers';
import { useToast } from "@/hooks/use-toast";

export const useWorkers = () => {
  const [workers, setWorkers] = useState<ShiftWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('useWorkers: Fetching workers...');
      const data = await getWorkers();
      console.log(`useWorkers: Fetched ${data.length} workers`);
      setWorkers(data);
    } catch (error) {
      console.error('Error fetching workers:', error);
      setError('שגיאה בטעינת רשימת העובדים');
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת העובדים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  return {
    workers,
    loading,
    error,
    loadWorkers,
    setWorkers
  };
};
