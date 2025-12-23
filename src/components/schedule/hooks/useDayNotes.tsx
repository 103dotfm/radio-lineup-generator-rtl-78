import { useState, useCallback, useEffect } from 'react';
import { getDayNotes } from '@/lib/api/dayNotes';
import { DayNote, ViewMode } from '@/types/schedule';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const useDayNotes = (selectedDate: Date, viewMode: ViewMode) => {
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [bottomNotes, setBottomNotes] = useState<DayNote[]>([]);
  
  const fetchDayNotes = useCallback(async () => {
    try {
      if (viewMode === 'weekly') {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
        
        // Fetch top notes
        const topNotes = await getDayNotes(weekStart, weekEnd, false);
        setDayNotes(topNotes);
        
        // Fetch bottom notes
        const bottomNotesData = await getDayNotes(weekStart, weekEnd, true);
        setBottomNotes(bottomNotesData);
      } else if (viewMode === 'monthly') {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        
        // Fetch top notes
        const topNotes = await getDayNotes(monthStart, monthEnd, false);
        setDayNotes(topNotes);
        
        // Fetch bottom notes
        const bottomNotesData = await getDayNotes(monthStart, monthEnd, true);
        setBottomNotes(bottomNotesData);
      } else {
        // Daily view
        const topNotes = await getDayNotes(selectedDate, selectedDate, false);
        setDayNotes(topNotes);
        
        const bottomNotesData = await getDayNotes(selectedDate, selectedDate, true);
        setBottomNotes(bottomNotesData);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
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
