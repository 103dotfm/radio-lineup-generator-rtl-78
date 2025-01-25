import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';

interface ShowCreditsProps {
  editor: Editor | null;
}

const ShowCredits = ({ editor }: ShowCreditsProps) => {
  if (!editor) return null;

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
        קרדיטים
      </label>
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md" />
    </div>
  );
};

export default ShowCredits;