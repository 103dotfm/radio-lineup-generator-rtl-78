import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';

interface ShowCreditsProps {
  editor: Editor | null;
}

const ShowCredits = ({ editor }: ShowCreditsProps) => {
  if (!editor) return null;

  return (
    <div className="col-span-2">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
    </div>
  );
};

export default ShowCredits;