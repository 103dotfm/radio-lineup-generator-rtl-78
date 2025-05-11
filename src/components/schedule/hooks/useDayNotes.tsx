
import { useState, useEffect, useCallback } from 'react';
import { getDayNotes } from '@/lib/supabase/dayNotes';
import { DayNote, ViewMode } from '@/types/schedule';
import { startOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';

export const useDayNotes = (selectedDate: Date, viewMode: ViewMode) => {
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [bottomNotes, setBottomNotes] = useState<DayNote[]>([]);

  const fetchDayNotes = useCallback(async () => {
    if (viewMode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      
      // Fetch top notes
      const topNotes = await getDayNotes(weekStart, weekEnd, false);
      setDayNotes(topNotes);
      
      // Fetch bottom notes (admin-only)
      const bottomNotesData = await getDayNotes(weekStart, weekEnd, true);
      setBottomNotes(bottomNotesData);
    } else if (viewMode === 'monthly') {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      
      // Fetch top notes
      const topNotes = await getDayNotes(monthStart, monthEnd, false);
      setDayNotes(topNotes);
      
      // Fetch bottom notes (admin-only)
      const bottomNotesData = await getDayNotes(monthStart, monthEnd, true);
      setBottomNotes(bottomNotesData);
    } else if (viewMode === 'daily') {
      // For daily view, just get notes for the selected date
      const topNotes = await getDayNotes(selectedDate, selectedDate, false);
      setDayNotes(topNotes);
      
      // Fetch bottom notes (admin-only)
      const bottomNotesData = await getDayNotes(selectedDate, selectedDate, true);
      setBottomNotes(bottomNotesData);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchDayNotes();
  }, [fetchDayNotes]);

  return {
    dayNotes,
    bottomNotes,
    refreshDayNotes: fetchDayNotes,
    refreshBottomNotes: fetchDayNotes
  };
};
