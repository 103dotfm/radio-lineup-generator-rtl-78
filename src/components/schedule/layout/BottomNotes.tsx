import React, { useState } from 'react';
import { DayNote } from '@/types/schedule';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Plus, Save, X } from 'lucide-react';
interface BottomNotesProps {
  dates: Date[];
  bottomNotes: DayNote[];
  editingBottomNoteDate: Date | null;
  onBottomNoteAdd: (date: Date) => void;
  onSaveBottomNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  onDeleteBottomNote: (noteId: string) => Promise<void>;
  onBottomNoteEdit: (date: Date) => void;
  readOnly?: boolean;
}
const BottomNotes: React.FC<BottomNotesProps> = ({
  dates,
  bottomNotes,
  editingBottomNoteDate,
  onBottomNoteAdd,
  onSaveBottomNote,
  onDeleteBottomNote,
  onBottomNoteEdit,
  readOnly = false
}) => {
  const [noteText, setNoteText] = useState<string>("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Find notes for specific date
  const getNotesForDate = (date: Date): DayNote[] => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const notes = bottomNotes.filter(note => note.date === formattedDate);

    return notes;
  };

  // Handle save
  const handleSave = (date: Date, noteId?: string) => {
    if (noteText.trim()) {
      onSaveBottomNote(date, noteText, noteId);
      setNoteText("");
      setEditingNoteId(null);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setNoteText("");
    setEditingNoteId(null);
    onBottomNoteEdit(new Date(0)); // Reset editing state
  };

  // Handle delete when editing
  const handleDelete = (noteId: string) => {
    if (!noteId) {
      console.error('Cannot delete note: noteId is null or undefined');
      return;
    }
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) {
      onDeleteBottomNote(noteId);
      setNoteText("");
      setEditingNoteId(null);
    }
  };

  // Handle note click for editing
  const handleNoteClick = (date: Date, note: DayNote) => {
    if (readOnly) return; // Don't allow editing in read-only mode
    if (!note.id) {
      console.error('Note has no ID:', note);
      return;
    }
    setNoteText(note.note);
    setEditingNoteId(note.id);
    onBottomNoteEdit(date);
  };

  // Handle note delete (on double click)
  const handleNoteDoubleClick = (noteId: string) => {
    if (readOnly) return; // Don't allow deleting in read-only mode
    if (!noteId) {
      console.error('Cannot delete note: noteId is null or undefined');
      return;
    }
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) {
      onDeleteBottomNote(noteId);
    }
  };

  // Handle add new note
  const handleAddNote = (date: Date) => {
    if (readOnly) return; // Don't allow adding in read-only mode
    setEditingNoteId(null); // Clear any existing editing note ID
    onBottomNoteAdd(date);
  };

  return <>
      {/* Empty cell for the time column */}
      <div className="p-2 text-center border-b border-r bg-gray-50 font-bold">
        הערות
      </div>

      {/* One cell per day */}
      {dates.map((date, index) => {
      const notesForDate = getNotesForDate(date);
      const isEditing = editingBottomNoteDate && format(editingBottomNoteDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      return <div key={`bottom-note-${date.toISOString()}`} className="border-b border-r p-2 min-h-[80px] bg-gray-50/50 relative">
            {notesForDate.length > 0 ? <div className="space-y-2">
                {notesForDate.map((note, noteIndex) => <div key={note.id || `temp-${noteIndex}-${date.toISOString()}`} className={`bg-white p-2 rounded shadow-sm ${readOnly ? '' : 'cursor-pointer hover:bg-gray-50 transition-colors'} ${isEditing && note.id === editingNoteId ? 'ring-2 ring-blue-400' : ''}`}>
                    {isEditing && note.id === editingNoteId && !readOnly ? <div className="space-y-2">
                        <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="הערה..." className="min-h-[60px] text-right" dir="rtl" autoFocus />
                        <div className="flex justify-end space-x-2 space-x-reverse">
                          <Button size="sm" variant="destructive" onClick={() => {
                            handleDelete(note.id);
                          }}>
                            <X className="h-4 w-4 ml-1" /> מחק
                          </Button>
                          <Button size="sm" onClick={() => handleSave(date, note.id)}>
                            <Save className="h-4 w-4 ml-1" /> שמור
                          </Button>
                        </div>
                      </div> : <div onClick={() => !readOnly && handleNoteClick(date, note)} onDoubleClick={() => !readOnly && handleNoteDoubleClick(note.id)} className={`text-center bg-violet-200 px-[4px] py-[4px] ${readOnly ? '' : 'cursor-pointer'}`}>
                        {note.note}
                        
                      </div>}
                  </div>)}

                {isEditing && !editingNoteId && !readOnly && <div className="bg-white p-2 rounded shadow-sm mt-2">
                    <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="הערה חדשה..." className="min-h-[60px] text-right" dir="rtl" autoFocus />
                    <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="h-4 w-4 ml-1" /> ביטול
                      </Button>
                      <Button size="sm" onClick={() => handleSave(date)}>
                        <Save className="h-4 w-4 ml-1" /> שמור
                      </Button>
                    </div>
                  </div>}

                {!readOnly && <div className="group relative mt-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => handleAddNote(date)} disabled={isEditing}>
                      <Plus className="h-4 w-4 ml-1" /> הערה חדשה
                    </Button>
                  </div>
                </div>}
              </div> : isEditing && !readOnly ? <div className="bg-white p-2 rounded shadow-sm">
                  <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="הערה..." className="min-h-[60px] text-right" dir="rtl" autoFocus />
                  <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 ml-1" /> ביטול
                    </Button>
                    <Button size="sm" onClick={() => handleSave(date)}>
                      <Save className="h-4 w-4 ml-1" /> שמור
                    </Button>
                  </div>
                </div> : !readOnly ? <div className="group relative min-h-[60px] flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => handleAddNote(date)}>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 text-sm">
                    <Plus className="h-4 w-4 ml-1 inline" /> הוסף הערה
                  </span>
                </div> : <div className="min-h-[60px] flex items-center justify-center">
                  <span className="text-gray-400 text-sm">אין הערות</span>
                </div>}
          </div>;
    })}
    </>;
};
export default BottomNotes;