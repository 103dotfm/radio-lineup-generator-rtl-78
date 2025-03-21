
import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import NextShowCredits from './NextShowCredits';

interface ShowCreditsProps {
  editor: Editor | null;
  nextShowName?: string;
  nextShowHost?: string;
  onRemoveNextShowLine?: () => void;
}

const ShowCredits = ({ editor, nextShowName, nextShowHost, onRemoveNextShowLine }: ShowCreditsProps) => {
  if (!editor) return null;

  return (
    <div className="col-span-2 space-y-4">
      {nextShowName && (
        <NextShowCredits
          editor={editor}
          nextShowName={nextShowName}
          nextShowHost={nextShowHost}
          onRemoveLine={onRemoveNextShowLine}
        />
      )}
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
    </div>
  );
};

export default ShowCredits;
