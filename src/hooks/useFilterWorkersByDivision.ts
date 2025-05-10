
import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";

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
        
        // Try to get from cache first
        const cacheKey = `workers-by-division-${divisionId}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const cacheTime = parsed.timestamp || 0;
            if (Date.now() - cacheTime < 5 * 60 * 1000) { // 5 minutes cache
              console.log(`Using cached workers for division ${divisionId}`);
              setWorkers(parsed.workerIds || []);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing workers by division cache:', e);
          }
        }
        
        // If not in cache, fetch from API
        const { data, error } = await supabase
          .from('worker_divisions')
          .select('worker_id')
          .eq('division_id', divisionId);
          
        if (error) {
          throw error;
        }
        
        console.log(`useFilterWorkersByDivision: Found ${data.length} workers for division ${divisionId}`);
        const workerIds = data.map(item => item.worker_id);
        
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          workerIds,
          timestamp: Date.now()
        }));
        
        setWorkers(workerIds);
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

export default useFilterWorkersByDivision;
