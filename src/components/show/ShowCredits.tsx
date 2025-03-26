
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Editor } from '@tiptap/react';
import NextShowCredits from './next-show/NextShowCredits';
import { useToast } from '@/hooks/use-toast';

interface ShowCreditsProps {
  showName: string;
  showHost?: string;
  showDate: Date;
  showTime: string;
  isPrerecorded?: boolean;
  isCollection?: boolean;
  editor?: Editor | null;
  nextShowName?: string;
  nextShowHost?: string;
  onRemoveNextShowLine?: () => void;
}

const ShowCredits: React.FC<ShowCreditsProps> = ({
  showName,
  showHost,
  showDate,
  showTime,
  isPrerecorded = false,
  isCollection = false,
  editor,
  nextShowName,
  nextShowHost,
  onRemoveNextShowLine
}) => {
  const { toast } = useToast();
  const [showNextShow, setShowNextShow] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the component should show the "Next show" section
    async function checkShowNext() {
      try {
        if (!showDate || !showTime) {
          console.log('ShowCredits: Missing showDate or showTime, not showing next show');
          setShowNextShow(false);
          return;
        }
        
        console.log(`ShowCredits: Checking next show for ${format(showDate, 'yyyy-MM-dd')} at ${showTime}`);
        
        if (nextShowName) {
          console.log('ShowCredits: nextShowName provided directly:', nextShowName);
          setShowNextShow(true);
        } else {
          console.log('ShowCredits: No nextShowName provided, not showing next show');
          setShowNextShow(false);
        }
      } catch (error) {
        console.error('Error in ShowCredits:', error);
        setShowNextShow(false);
      }
    }
    
    checkShowNext();
  }, [showDate, showTime, nextShowName]);

  return (
    <div className="mb-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-md">
      <div className="font-bold text-lg">{showName}</div>
      
      {showHost && (
        <div className="text-sm mb-1">בהגשת {showHost}</div>
      )}
      
      <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-3">
        {showDate && (
          <span>
            {format(showDate, 'dd/MM/yyyy')}
          </span>
        )}
        
        {showTime && (
          <span>
            {showTime}
          </span>
        )}
        
        {isPrerecorded && (
          <span className="text-amber-600 dark:text-amber-400">
            תוכנית מוקלטת
          </span>
        )}
        
        {isCollection && (
          <span className="text-blue-600 dark:text-blue-400">
            לקט
          </span>
        )}
      </div>
      
      {editor && nextShowName && (
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
