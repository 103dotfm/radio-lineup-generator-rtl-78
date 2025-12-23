import React from 'react';
import { Button } from "@/components/ui/button";
import { Editor, EditorContent } from '@tiptap/react';
import { Input } from "@/components/ui/input";
import { Trash2, GripVertical } from "lucide-react";
import { sanitizeNotes } from '@/utils/sanitize';

interface NoteItemProps {
  id: string;
  editor: Editor | null;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
  isBackupShow?: boolean;
}

const NoteItem = ({
  id,
  editor,
  duration,
  onDelete,
  onDurationChange,
  isAuthenticated,
  showMinutes = false,
  isBackupShow = false,
}: NoteItemProps) => {
  // When minutes are not showing, we want the editor to span all columns except the actions column
  const mainColspan = 4;

  return (
    <>
      <td colSpan={mainColspan} className="py-4 px-6 border-b border-yellow-100 bg-amber-50/50 backdrop-blur-sm">
        <div className="relative group">
          {editor?.isEditable ? (
            <div className="prose prose-sm max-w-none text-center bg-white/50 rounded-xl p-2 border border-amber-100/50 shadow-inner">
              {editor && <EditorContent editor={editor} />}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-center font-medium text-amber-900/70 italic" dangerouslySetInnerHTML={{ __html: sanitizeNotes(editor?.getHTML() || '') }} />
          )}
          <div className="absolute -top-3 right-4 px-2 bg-amber-100 text-[10px] font-black text-amber-600 rounded-full border border-amber-200">הערה</div>
        </div>
      </td>

      {showMinutes && (
        <td className="py-4 px-4 border-b border-yellow-100 bg-amber-50/50 text-center w-24">
          <Input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 0)}
            className="w-16 h-10 text-center bg-white/50 border-amber-200/50 rounded-xl font-black text-amber-700 focus:ring-4 focus:ring-amber-400/10 transition-all mx-auto"
          />
        </td>
      )}

      <td className="py-4 px-6 border-b border-yellow-100 bg-amber-50/50 text-center">
        <div className="flex justify-center items-center gap-2">
          {!isBackupShow && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
              className="h-10 w-10 rounded-xl text-amber-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <div className="h-10 w-10 flex items-center justify-center cursor-grab active:cursor-grabbing text-amber-200 hover:text-amber-500 transition-colors">
            <GripVertical className="h-5 w-5" />
          </div>
        </div>
      </td>
    </>
  );
};

export default NoteItem;
