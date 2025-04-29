
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, addWeeks, isValid } from 'date-fns';
import { DayNote } from '@/types/schedule';
import { supabase } from '@/lib/supabase';

export const useDayNotes = (selectedDate: Date, viewMode: string) => {
  // Ensure we have a valid date
  const isValidDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime());
  const dateKey = isValidDate ? format(selectedDate, 'yyyy-MM-dd') : 'invalid-date';

  const {
    data: dayNotes = [],
    error,
    refetch: refreshDayNotes
  } = useQuery({
    queryKey: ['dayNotes', dateKey, viewMode],
    queryFn: async () => {
      if (!isValidDate) {
        console.error('Invalid date in useDayNotes:', selectedDate);
        return [];
      }
      
      try {
        let startDate, endDate;
        
        switch (viewMode) {
          case 'daily':
            // For daily view, just get notes for the selected day
            startDate = format(selectedDate, 'yyyy-MM-dd');
            endDate = startDate;
            break;
            
          case 'weekly':
            // For weekly view, get notes for the whole week
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
            startDate = format(weekStart, 'yyyy-MM-dd');
            const weekEnd = addDays(weekStart, 6);
            endDate = format(weekEnd, 'yyyy-MM-dd');
            break;
            
          case 'monthly':
            // For monthly view, get notes for the whole month plus padding
            const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            startDate = format(monthStart, 'yyyy-MM-dd');
            const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            endDate = format(monthEnd, 'yyyy-MM-dd');
            break;
            
          default:
            // Default to weekly view
            const defaultWeekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
            startDate = format(defaultWeekStart, 'yyyy-MM-dd');
            const defaultWeekEnd = addDays(defaultWeekStart, 6);
            endDate = format(defaultWeekEnd, 'yyyy-MM-dd');
        }
        
        console.log('Fetching day notes for range:', { startDate, endDate });
        const { data, error } = await supabase
          .from('day_notes')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);
        
        if (error) {
          console.error('Error fetching day notes:', error);
          throw error;
        }
        
        return data as DayNote[] || [];
      } catch (error) {
        console.error('Error in useDayNotes:', error);
        throw error;
      }
    },
    staleTime: 60000, // Cache for 1 minute
    retry: 2,
  });

  return {
    dayNotes,
    error,
    refreshDayNotes
  };
};
