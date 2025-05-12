
import React, { useEffect, useState } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import NextShowCredits from './next-show/NextShowCredits';
import DigitalCreditsSuggestion from './DigitalCreditsSuggestion';
import ProducersCreditsComponent from './ProducersCreditsComponent';
import { ProducerAssignment } from '@/lib/supabase/producers';
import { getProducerAssignments } from '@/lib/supabase/producers';
import { format, startOfWeek } from 'date-fns';

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
  const [producerAssignments, setProducerAssignments] = useState<ProducerAssignment[]>([]);
  const [isLoadingProducers, setIsLoadingProducers] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState({
    producers: false,
    digital: false,
    nextShow: false
  });

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!showDate) return;
      
      try {
        setIsLoadingProducers(true);
        const weekStartDay = startOfWeek(showDate, { weekStartsOn: 0 });
        console.log('Fetching producer assignments for week:', format(weekStartDay, 'yyyy-MM-dd'));
        const assignments = await getProducerAssignments(weekStartDay);
        setProducerAssignments(assignments);
      } catch (error) {
        console.error('Error fetching producer assignments:', error);
      } finally {
        setIsLoadingProducers(false);
      }
    };

    fetchAssignments();
  }, [showDate]);
  
  // Check if all suggested credits have been added
  const allCreditsAdded = Object.values(creditsAdded).every(added => added);
  
  // Handle individual credit additions
  const handleProducerCreditAdded = () => setCreditsAdded(prev => ({ ...prev, producers: true }));
  const handleDigitalCreditAdded = () => setCreditsAdded(prev => ({ ...prev, digital: true }));
  const handleNextShowCreditAdded = () => setCreditsAdded(prev => ({ ...prev, nextShow: true }));

  if (!editor) return null;

  const hasCreditsToShow = 
    (!isLoadingProducers && producerAssignments.length > 0 && showDate && showTime) || 
    (showDate && showTime) || 
    nextShowName;
    
  // Don't show the suggestions box if all credits have been added
  const showSuggestionsBox = hasCreditsToShow && !allCreditsAdded;

  return (
    <div className="col-span-2 space-y-4">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
      
      {showSuggestionsBox && (
        <div className="space-y-4 rounded-md border p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-500">הצעות קרדיטים</h3>
          
          {!isLoadingProducers && showDate && showTime && (
            <ProducersCreditsComponent 
              editor={editor}
              assignments={producerAssignments}
              showDate={showDate}
              showTime={showTime}
              onCreditAdded={handleProducerCreditAdded}
              allCreditsAdded={allCreditsAdded}
            />
          )}
          
          {showDate && showTime && (
            <DigitalCreditsSuggestion 
              showDate={showDate} 
              showTime={showTime} 
              editor={editor}
              onCreditAdded={handleDigitalCreditAdded}
              allCreditsAdded={allCreditsAdded}
            />
          )}
          
          {nextShowName && (
            <NextShowCredits
              editor={editor}
              nextShowName={nextShowName}
              nextShowHost={nextShowHost}
              onRemoveLine={onRemoveNextShowLine}
              onCreditAdded={handleNextShowCreditAdded}
              allCreditsAdded={allCreditsAdded}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ShowCredits;
