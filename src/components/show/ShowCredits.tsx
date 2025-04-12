
import React from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import NextShowCredits from './next-show/NextShowCredits';
import DigitalCreditsSuggestion from './DigitalCreditsSuggestion';

interface ShowCreditsProps {
  editor: Editor | null;
  nextShowName?: string;
  nextShowHost?: string;
  onRemoveNextShowLine?: () => void;
  showDate?: Date;
  showTime?: string;
}

const ShowCredits = ({ 
  editor, 
  nextShowName, 
  nextShowHost, 
  onRemoveNextShowLine,
  showDate,
  showTime
}: ShowCreditsProps) => {
  if (!editor) return null;

  console.log('ShowCredits rendering with date:', showDate, 'and time:', showTime);

  return (
    <div className="col-span-2 space-y-4">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
      
      {showDate && showTime && (
        <DigitalCreditsSuggestion 
          showDate={showDate} 
          showTime={showTime} 
          editor={editor} 
        />
      )}
      
      {nextShowName && (
        <NextShowCredits
          editor={editor}
          nextShowName={nextShowName}
          nextShowHost={nextShowHost}
          onRemoveLine={onRemoveNextShowLine}
        />
      )}
    </div>
  );
};

export default ShowCredits;
