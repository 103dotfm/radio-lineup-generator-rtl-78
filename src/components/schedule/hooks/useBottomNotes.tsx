import { useState } from 'react';
import { DayNote } from '@/types/schedule';
import { createDayNote, updateDayNote, deleteDayNote } from '@/lib/api/dayNotes';
import { format } from 'date-fns';

export const useBottomNotes = (bottomNotes: DayNote[], onBottomNoteChange: () => void) => {
  const [editingBottomNoteDate, setEditingBottomNoteDate] = useState<Date | null>(null);

  // Handle save bottom note
  const handleSaveBottomNote = async (date: Date, noteText: string, noteId?: string) => {
    try {
      if (noteId) {
        await updateDayNote(noteId, noteText);
      } else {
        await createDayNote(date, noteText, true);
      }
      onBottomNoteChange();
      setEditingBottomNoteDate(null);
    } catch (error) {
      console.error('Error saving bottom note:', error);
    }
  };

  // Handle delete bottom note
  const handleDeleteBottomNote = async (noteId: string) => {
    try {
      await deleteDayNote(noteId);
      onBottomNoteChange();
      setEditingBottomNoteDate(null);
    } catch (error) {
      console.error('Error deleting bottom note:', error);
    }
  };

  // Get bottom notes for a specific date
  const getBottomNotesForDate = (date: Date): DayNote[] => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return bottomNotes.filter(note => note.date === formattedDate);
  };

  // Handle add bottom note
  const handleBottomNoteAdd = (date: Date) => {
    setEditingBottomNoteDate(date);
  };

  // Handle edit bottom note
  const handleBottomNoteEdit = (date: Date) => {
    setEditingBottomNoteDate(date);
  };

  return {
    editingBottomNoteDate,
    handleSaveBottomNote,
    handleDeleteBottomNote,
    handleBottomNoteAdd,
    handleBottomNoteEdit,
    getBottomNotesForDate,
  };
};
