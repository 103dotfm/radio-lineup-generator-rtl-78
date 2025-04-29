
import { useState, useEffect, useCallback } from 'react';
import { getDayNotes } from '@/lib/supabase/dayNotes';
import { DayNote, ViewMode } from '@/types/schedule';
import { startOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';

export const useDayNotes = (selectedDate: Date, viewMode: ViewMode) => {
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);

  const fetchDayNotes = useCallback(async () => {
    if (viewMode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      const notes = await getDayNotes(weekStart, weekEnd);
      setDayNotes(notes);
    } else if (viewMode === 'monthly') {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const notes = await getDayNotes(monthStart, monthEnd);
      setDayNotes(notes);
    } else if (viewMode === 'daily') {
      // For daily view, just get notes for the selected date
      const notes = await getDayNotes(selectedDate, selectedDate);
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
