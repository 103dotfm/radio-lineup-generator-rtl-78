import React from 'react';
import { Button } from "@/components/ui/button";
import { Editor } from '@tiptap/react';
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface NoteItemProps {
  id: string;
  editor: Editor | null;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => void;
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
      <td colSpan={isAuthenticated ? 4 : 3} className="py-2 px-4 border border-gray-200">
        {editor?.isEditable ? (
          <div className="prose prose-sm max-w-none">
            {editor && <editor.Content />}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
        )}
      </td>
      <td className="py-2 px-4 border border-gray-200">
        <Input
          type="number"
          min="0"
          value={duration}
          onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 0)}
          className="w-20"
        />
      </td>
      <td className="py-2 px-4 border border-gray-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </>
  );
};

export default NoteItem;