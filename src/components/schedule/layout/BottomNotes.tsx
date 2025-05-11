
import React, { useState } from 'react';
import { DayNote } from '@/types/schedule';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Plus, Edit, Trash, Save, X } from 'lucide-react';

interface BottomNotesProps {
  dates: Date[];
  bottomNotes: DayNote[];
  editingBottomNoteDate: Date | null;
  onBottomNoteAdd: (date: Date) => void;
  onSaveBottomNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  onDeleteBottomNote: (noteId: string) => Promise<void>;
  onBottomNoteEdit: (date: Date) => void;
}

const BottomNotes: React.FC<BottomNotesProps> = ({
  dates,
  bottomNotes,
  editingBottomNoteDate,
  onBottomNoteAdd,
  onSaveBottomNote,
  onDeleteBottomNote,
  onBottomNoteEdit
}) => {
  const [noteText, setNoteText] = useState<string>("");

  // Find notes for specific date
  const getNotesForDate = (date: Date): DayNote[] => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return bottomNotes.filter(note => note.date === formattedDate);
  };

  // Handle note editing
  const handleEditNote = (date: Date, note: DayNote) => {
    onBottomNoteEdit(date);
    setNoteText(note.note);
  };

  // Handle save
  const handleSave = (date: Date, noteId?: string) => {
    if (noteText.trim()) {
      onSaveBottomNote(date, noteText, noteId);
      setNoteText("");
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setNoteText("");
    onBottomNoteEdit(new Date(0)); // Reset editing state
  };

  return (
    <>
      {/* Empty cell for the time column */}
      <div className="p-2 text-center border-b border-r bg-gray-50 font-bold">
        הערות תחתונות
      </div>

      {/* One cell per day */}
      {dates.map((date, index) => {
        const notesForDate = getNotesForDate(date);
        const isEditing = editingBottomNoteDate && 
          format(editingBottomNoteDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');

        return (
          <div key={`bottom-note-${date.toISOString()}`} className="border-b border-r p-2 min-h-[80px] bg-gray-50/50 relative">
            {notesForDate.length > 0 ? (
              <div className="space-y-2">
                {notesForDate.map((note) => (
                  <div key={note.id} className="bg-white p-2 rounded shadow-sm">
                    {isEditing && note.id === (editingBottomNoteDate as any).noteId ? (
                      <div className="space-y-2">
                        <Textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="הערה..."
                          className="min-h-[60px] text-right"
                          dir="rtl"
                        />
                        <div className="flex justify-end space-x-2 space-x-reverse">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancel}
                          >
                            <X className="h-4 w-4 ml-1" /> ביטול
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSave(date, note.id)}
                          >
                            <Save className="h-4 w-4 ml-1" /> שמור
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={() => handleEditNote(date, note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700" 
                            onClick={() => onDeleteBottomNote(note.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right flex-grow">{note.note}</div>
                      </div>
                    )}
                  </div>
                ))}

                {isEditing && !(editingBottomNoteDate as any).noteId && (
                  <div className="bg-white p-2 rounded shadow-sm mt-2">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="הערה חדשה..."
                      className="min-h-[60px] text-right"
                      dir="rtl"
                    />
                    <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancel}
                      >
                        <X className="h-4 w-4 ml-1" /> ביטול
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleSave(date)}
                      >
                        <Save className="h-4 w-4 ml-1" /> שמור
                      </Button>
                    </div>
                  </div>
                )}

                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="mt-2" 
                  onClick={() => onBottomNoteAdd(date)}
                  disabled={isEditing}
                >
                  <Plus className="h-4 w-4 ml-1" /> הערה חדשה
                </Button>
              </div>
            ) : (
              isEditing ? (
                <div className="bg-white p-2 rounded shadow-sm">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="הערה..."
                    className="min-h-[60px] text-right"
                    dir="rtl"
                  />
                  <div className="flex justify-end space-x-2 space-x-reverse mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 ml-1" /> ביטול
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleSave(date)}
                    >
                      <Save className="h-4 w-4 ml-1" /> שמור
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center" 
                  onClick={() => onBottomNoteAdd(date)}
                >
                  <Plus className="h-4 w-4 ml-1" /> הוסף הערה
                </Button>
              )
            )}
          </div>
        );
      })}
    </>
  );
};

export default BottomNotes;
