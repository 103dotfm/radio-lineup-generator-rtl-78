
import { useState, useEffect } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { supabase } from '@/lib/supabase';

export const useProducers = () => {
  const [producers, setProducers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProducers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('useProducers: Fetching producers...');
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }

      if (data) {
        console.log(`useProducers: Fetched ${data.length} producers`);
        setProducers(data);
      }
    } catch (err) {
      console.error('Error loading producers:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading producers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducers();
  }, []);

  return { producers, loading, error, loadProducers };
};
