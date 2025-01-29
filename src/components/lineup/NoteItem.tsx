import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { Editor, EditorContent } from '@tiptap/react';

interface NoteItemProps {
  id: string;
  editor: Editor | null;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string) => void;
  isAuthenticated: boolean;
}

const NoteItem = ({
  id,
  editor,
  duration,
  onDelete,
  onDurationChange,
  isAuthenticated,
}: NoteItemProps) => {
  return (
    <>
      <td colSpan={isAuthenticated ? 4 : 3} className="py-2 px-4 border border-gray-200 text-center">
        <EditorContent editor={editor} className="prose prose-sm text-center flex-1" />
      </td>
      <td className="py-2 px-4 border border-gray-200 text-center">
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 5)}
          className="w-20 mx-auto text-center"
        />
      </td>
      <td className="py-2 px-4 border border-gray-200">
        <div className="flex gap-2 justify-center items-center">
          <span className="cursor-move">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </>
  );
};

export default NoteItem;