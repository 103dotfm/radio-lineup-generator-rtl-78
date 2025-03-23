
import { useState, useEffect, useCallback } from 'react';
import { getDayNotes } from '@/lib/supabase/dayNotes';
import { DayNote } from '@/types/schedule';
import { startOfWeek, addDays } from 'date-fns';

export const useDayNotes = (selectedDate: Date, viewMode: 'weekly' | 'daily') => {
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);

  const fetchDayNotes = useCallback(async () => {
    if (viewMode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      const notes = await getDayNotes(weekStart, weekEnd);
      setDayNotes(notes);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchDayNotes();
  }, [fetchDayNotes]);

  return {
    dayNotes,
    refreshDayNotes: fetchDayNotes
  };
};
