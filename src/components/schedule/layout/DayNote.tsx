
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus } from 'lucide-react';
import { DayNote } from '@/types/schedule';

interface DayNoteProps {
  note: DayNote | null;
  date: Date;
  onSave: (date: Date, text: string, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isAdmin: boolean;
}

export default function DayNoteComponent({
  note,
  date,
  onSave,
  onDelete,
  isAdmin
}: DayNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note?.note || '');

  const handleSave = async () => {
    if (text.trim()) {
      await onSave(date, text, note?.id);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (note && window.confirm('האם אתה בטוח שברצונך למחוק את ההערה?')) {
      await onDelete(note.id);
      setText('');
    }
  };

  if (!isAdmin) {
    return note ? (
      <div className="day-note text-sm text-gray-700 mt-1 p-1 bg-gray-100 rounded">
        {note.note}
      </div>
    ) : null;
  }

  if (isEditing) {
    return (
      <div className="day-note relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full text-sm p-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          placeholder="הערה ליום זה..."
          autoFocus
        />
        <div className="flex justify-end mt-1 gap-1">
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            size="sm"
            className="py-0 h-6 text-xs"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            variant="default"
            size="sm"
            className="py-0 h-6 text-xs"
          >
            שמור
          </Button>
        </div>
      </div>
    );
  }

  if (note) {
    return (
      <div className="day-note relative text-sm text-gray-700 mt-1 p-1 bg-gray-100 rounded">
        {note.note}
        <div className="actions opacity-0 hover:opacity-100 transition-opacity">
          <Button
            onClick={() => {
              setText(note.note);
              setIsEditing(true);
            }}
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6"
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="day-note relative min-h-6">
      <Button
        onClick={() => {
          setText('');
          setIsEditing(true);
        }}
        variant="ghost"
        size="sm"
        className="p-0 h-6 w-6"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
