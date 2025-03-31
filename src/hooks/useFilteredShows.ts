
import { useState, useEffect } from 'react';
import { getShowsByDate, getShows } from '@/lib/supabase/shows';
import { format, isSameDay, parseISO } from 'date-fns';
import { Show } from '@/types/show';

export const useFilteredShows = (selectedDate: Date | null, dayOnly: boolean = false) => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        setLoading(true);
        
        if (!selectedDate) {
          setShows([]);
          return;
        }

        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        if (dayOnly) {
          // When we need shows only for a specific day
          const dayShows = await getShowsByDate(dateString);
          console.log(`Fetched ${dayShows.length} shows for date ${dateString}`);
          setShows(dayShows);
        } else {
          // When we need all shows but want to filter client-side
          const allShows = await getShows();
          const filteredShows = allShows.filter(show => {
            if (!show.date) return false;
            const showDate = parseISO(show.date as string);
            return isSameDay(showDate, selectedDate);
          });
          console.log(`Filtered ${filteredShows.length} shows out of ${allShows.length} for date ${dateString}`);
          setShows(filteredShows);
        }
      } catch (err) {
        console.error("Error fetching shows:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setShows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, [selectedDate, dayOnly]);

  return { shows, loading, error };
};
