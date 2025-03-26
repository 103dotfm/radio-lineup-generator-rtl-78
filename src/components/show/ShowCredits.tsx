
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
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string>('');

  useEffect(() => {
    if (propNextShowName) {
      console.log('Using provided next show props:', { name: propNextShowName, host: propNextShowHost });
      setNextShowInfo({ name: propNextShowName, host: propNextShowHost });
      return;
    }

    const fetchNextShow = async () => {
      if (!showDate || !showTime) {
        console.log('Show date or time not provided, cannot fetch next show');
        return;
      }

      // Create a unique key for this fetch to avoid duplicate fetches
      const fetchKey = `${format(showDate, 'yyyy-MM-dd')}-${showTime}`;
      if (fetchKey === lastFetch) {
        console.log('Already fetched next show for this date/time');
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching next show for date:', showDate, 'time:', showTime);
        const nextShow = await getNextShow(showDate, showTime);
        console.log('Next show result:', nextShow);
        
        if (nextShow) {
          setNextShowInfo(nextShow);
        } else {
          setNextShowInfo(null);
        }
        setLastFetch(fetchKey);
      } catch (error) {
        console.error('Error fetching next show:', error);
        setNextShowInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNextShow();
  }, [propNextShowName, propNextShowHost, showDate, showTime, lastFetch]);

  if (!editor) return null;

  return (
    <div className="col-span-2 space-y-4">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
      
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center">טוען מידע על התוכנית הבאה...</div>
      ) : nextShowInfo?.name ? (
        <NextShowCredits
          editor={editor}
          nextShowName={nextShowInfo.name}
          nextShowHost={nextShowInfo.host}
          onRemoveLine={onRemoveNextShowLine}
        />
      ) : null}
    </div>
  );
};

export default ShowCredits;
