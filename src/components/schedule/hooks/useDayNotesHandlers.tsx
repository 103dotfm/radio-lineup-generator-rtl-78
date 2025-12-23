import { useState } from 'react';
import { format } from 'date-fns';
import { DayNote } from '@/types/schedule';
import { createDayNote, updateDayNote, deleteDayNote } from '@/lib/db/dayNotes';

export const useDayNotesHandlers = (dayNotes: DayNote[], onDayNoteChange: () => void) => {
  const [editingNoteDate, setEditingNoteDate] = useState<Date | null>(null);

  const handleSaveDayNote = async (date: Date, noteText: string, noteId?: string) => {
    try {
      if (noteId) {
        await updateDayNote(noteId, noteText);
      } else {
        await createDayNote(date, noteText);
      }
      onDayNoteChange();
      setEditingNoteDate(null);
    } catch (error) {
      console.error('Error saving day note:', error);
    }
  };

  const handleDeleteDayNote = async (noteId: string) => {
    try {
      await deleteDayNote(noteId);
      onDayNoteChange();
    } catch (error) {
      console.error('Error deleting day note:', error);
    }
  };

  const getNoteForDate = (date: Date): DayNote | null => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return dayNotes.find(note => note.date === formattedDate) || null;
  };

  const handleDayHeaderClick = (date: Date) => {
    if (!date) return;
    setEditingNoteDate(prev => 
      prev && prev.getTime() === date.getTime() ? null : date
    );
  };

  return {
    editingNoteDate,
    setEditingNoteDate,
    handleSaveDayNote,
    handleDeleteDayNote,
    getNoteForDate,
    handleDayHeaderClick
  };
};
