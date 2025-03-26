import React, { useEffect, useState } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import NextShowCredits from './next-show/NextShowCredits';
import { getNextShow } from '@/lib/getNextShow';

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
  nextShowName: propNextShowName, 
  nextShowHost: propNextShowHost, 
  onRemoveNextShowLine, 
  showDate,
  showTime
}: ShowCreditsProps) => {
  const [nextShowInfo, setNextShowInfo] = useState<{name?: string, host?: string} | null>(
    propNextShowName ? { name: propNextShowName, host: propNextShowHost } : null
  );

  useEffect(() => {
    if (propNextShowName) {
      setNextShowInfo({ name: propNextShowName, host: propNextShowHost });
      return;
    }

    const fetchNextShow = async () => {
      if (!showDate || !showTime) {
        console.log('Show date or time not provided, cannot fetch next show');
        return;
      }

      try {
        console.log('Fetching next show for date:', showDate, 'time:', showTime);
        const nextShow = await getNextShow(showDate, showTime);
        console.log('Next show result:', nextShow);
        
        if (nextShow) {
          setNextShowInfo(nextShow);
        } else {
          setNextShowInfo(null);
        }
      } catch (error) {
        console.error('Error fetching next show:', error);
        setNextShowInfo(null);
      }
    };

    fetchNextShow();
  }, [propNextShowName, propNextShowHost, showDate, showTime]);

  if (!editor) return null;

  return (
    <div className="col-span-2 space-y-4">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
      
      {nextShowInfo?.name && (
        <NextShowCredits
          editor={editor}
          nextShowName={nextShowInfo.name}
          nextShowHost={nextShowInfo.host}
          onRemoveLine={onRemoveNextShowLine}
        />
      )}
    </div>
  );
};

export default ShowCredits;
