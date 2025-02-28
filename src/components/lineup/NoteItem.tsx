
import React from 'react';
import { Button } from "@/components/ui/button";
import { Editor, EditorContent } from '@tiptap/react';
import { Input } from "@/components/ui/input";
import { Trash2, GripVertical } from "lucide-react";

interface NoteItemProps {
  id: string;
  editor: Editor | null;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
}

const NoteItem = ({
  id,
  editor,
  duration,
  onDelete,
  onDurationChange,
  isAuthenticated,
  showMinutes = false,
}: NoteItemProps) => {
  const colspan = isAuthenticated ? (showMinutes ? 4 : 3) : (showMinutes ? 3 : 2);
  const actionsColspan = 1;
  
  return (
    <>
      <td colSpan={colspan} className="py-2 px-4 border border-gray-200">
        {editor?.isEditable ? (
          <div className="prose prose-sm max-w-none text-center">
            {editor && <EditorContent editor={editor} />}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-center" dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
        )}
      </td>
      {showMinutes && (
        <td className="py-2 px-4 border border-gray-200 text-center w-20">
          <Input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 0)}
            className="w-20 text-center mx-auto"
          />
        </td>
      )}
      <td className="py-2 px-4 border border-gray-200" colSpan={actionsColspan}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="cursor-move">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </td>
    </>
  );
};

export default NoteItem;
