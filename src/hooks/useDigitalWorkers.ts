
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DigitalWorker {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_active: boolean;
}

export const useDigitalWorkers = () => {
  const [digitalWorkers, setDigitalWorkers] = useState<DigitalWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDigitalWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('digital_employees')
        .select('*')
        .order('full_name');
      
      if (error) {
        throw error;
      }

      if (data) {
        setDigitalWorkers(data);
      }
    } catch (err) {
      console.error('Error loading digital workers:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading digital workers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDigitalWorkers();
  }, []);

  return { digitalWorkers, loading, error, loadDigitalWorkers };
};
