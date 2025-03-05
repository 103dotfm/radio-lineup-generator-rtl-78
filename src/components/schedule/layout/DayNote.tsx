
import React, { useState } from 'react';
import { Pencil, Trash2, X, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DayNote as DayNoteType } from '@/types/schedule';

interface DayNoteProps {
  note: DayNoteType | null;
  date: Date;
  onSave: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  isAdmin: boolean;
}

const DayNote: React.FC<DayNoteProps> = ({ note, date, onSave, onDelete, isAdmin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(note?.note || '');

  const handleSave = async () => {
    if (noteText.trim()) {
      await onSave(date, noteText, note?.id);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (note?.id) {
      if (window.confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) {
        await onDelete(note.id);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setNoteText(note?.note || '');
    }
  };

  if (!note && !isAdmin) return null;

  return (
    <div className="mt-1 relative day-note">
      {!isEditing ? (
        <>
          {note && (
            <div 
              className="text-sm text-gray-200 bg-black/80 p-1 rounded min-h-[24px]"
              onClick={() => isAdmin && setIsEditing(true)}
            >
              {note.note}
            </div>
          )}
          {isAdmin && note && (
            <div className="absolute top-0 left-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-red-100" 
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex">
          <textarea
            className="text-sm p-1 rounded flex-1 min-h-[40px] bg-black/90 text-gray-200 focus:outline-none"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="הערה ליום זה..."
          />
          <div className="flex flex-col gap-1 mr-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 bg-black/20 hover:bg-green-100" 
              onClick={handleSave}
            >
              <CheckCircle className="h-3 w-3 text-green-500" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 bg-black/20 hover:bg-red-100" 
              onClick={() => {
                setIsEditing(false);
                setNoteText(note?.note || '');
              }}
            >
              <X className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayNote;
