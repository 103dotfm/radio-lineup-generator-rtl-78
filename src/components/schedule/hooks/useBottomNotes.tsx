
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { DayNote } from '@/types/schedule';
import { createDayNote, updateDayNote, deleteDayNote } from '@/lib/supabase/dayNotes';

export const useBottomNotes = (bottomNotes: DayNote[], onBottomNoteChange: () => void) => {
  const [editingBottomNoteDate, setEditingBottomNoteDate] = useState<Date | null>(null);

  const handleSaveBottomNote = async (date: Date, noteText: string, noteId?: string) => {
    try {
      if (noteId) {
        await updateDayNote(noteId, noteText);
      } else {
        // For bottom notes, we pass the is_bottom_note flag as true
        await createDayNote(date, noteText, true);
      }
      onBottomNoteChange();
      setEditingBottomNoteDate(null);
    } catch (error) {
      console.error('Error saving bottom note:', error);
    }
  };

  const handleDeleteBottomNote = async (noteId: string) => {
    try {
      await deleteDayNote(noteId);
      onBottomNoteChange();
    } catch (error) {
      console.error('Error deleting bottom note:', error);
    }
  };

  const getBottomNotesForDate = (date: Date): DayNote[] => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return bottomNotes.filter(note => note.date === formattedDate);
  };

  const handleBottomNoteAdd = (date: Date) => {
    setEditingBottomNoteDate(date);
  };

  const handleBottomNoteEdit = (date: Date, noteId?: string) => {
    const noteDate = new Date(date);
    // Store noteId to know which note we're editing
    if (noteId) {
      (noteDate as any).noteId = noteId;
    }
    setEditingBottomNoteDate(noteDate);
  };

  return {
    editingBottomNoteDate,
    setEditingBottomNoteDate,
    handleSaveBottomNote,
    handleDeleteBottomNote,
    getBottomNotesForDate,
    handleBottomNoteAdd,
    handleBottomNoteEdit
  };
};
