
import { useState, useEffect } from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { supabase } from "@/lib/supabase";
import { startOfWeek, format } from 'date-fns';

export interface UseScheduleSlotsResult {
  scheduleSlots: ScheduleSlot[];
  isLoading: boolean;
  error: Error | null;
}

export const useScheduleSlots = (selectedDate: Date): UseScheduleSlotsResult => {
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchScheduleSlots = async () => {
      setIsLoading(true);
      try {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('schedule_slots_old')
          .select('*')
          .not('is_deleted', 'eq', true)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) {
          throw error;
        }

        setScheduleSlots(data || []);
      } catch (err) {
        console.error('Error fetching schedule slots:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduleSlots();
  }, [selectedDate]);

  return { scheduleSlots, isLoading, error };
};
