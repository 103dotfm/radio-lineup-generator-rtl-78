
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
  const [dismissedSuggestions, setDismissedSuggestions] = useState({
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
  
  // Check if all suggested credits have been added or dismissed
  const allCreditsAddedOrDismissed = Object.keys(creditsAdded).every(key => 
    creditsAdded[key as keyof typeof creditsAdded] || 
    dismissedSuggestions[key as keyof typeof dismissedSuggestions]
  );
  
  // Handle individual credit additions
  const handleProducerCreditAdded = () => setCreditsAdded(prev => ({ ...prev, producers: true }));
  const handleDigitalCreditAdded = () => setCreditsAdded(prev => ({ ...prev, digital: true }));
  const handleNextShowCreditAdded = () => setCreditsAdded(prev => ({ ...prev, nextShow: true }));

  // Handle dismissal of suggestions
  const handleDismissProducer = () => setDismissedSuggestions(prev => ({ ...prev, producers: true }));
  const handleDismissDigital = () => setDismissedSuggestions(prev => ({ ...prev, digital: true }));
  const handleDismissNextShow = () => setDismissedSuggestions(prev => ({ ...prev, nextShow: true }));

  if (!editor) return null;

  // Check if there are any suggestions to display
  const hasProducerSuggestion = !isLoadingProducers && producerAssignments.length > 0 && showDate && showTime && !creditsAdded.producers && !dismissedSuggestions.producers;
  const hasDigitalSuggestion = showDate && showTime && !creditsAdded.digital && !dismissedSuggestions.digital;
  const hasNextShowSuggestion = nextShowName && !creditsAdded.nextShow && !dismissedSuggestions.nextShow;
  
  // Check if any suggestions are available to display
  const hasSuggestions = hasProducerSuggestion || hasDigitalSuggestion || hasNextShowSuggestion;
    
  // Don't show the suggestions box if all credits have been added or dismissed
  const showSuggestionsBox = hasSuggestions && !allCreditsAddedOrDismissed;

  return (
    <div className="col-span-2 space-y-4">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
      
      {showSuggestionsBox && (
        <div className="space-y-4 rounded-md border p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-500">הצעות קרדיטים</h3>
          
          {hasProducerSuggestion && (
            <ProducersCreditsComponent 
              editor={editor}
              assignments={producerAssignments}
              showDate={showDate}
              showTime={showTime}
              onCreditAdded={handleProducerCreditAdded}
              onDismiss={handleDismissProducer}
              allCreditsAdded={false}
            />
          )}
          
          {hasDigitalSuggestion && (
            <DigitalCreditsSuggestion 
              showDate={showDate} 
              showTime={showTime} 
              editor={editor}
              onCreditAdded={handleDigitalCreditAdded}
              onDismiss={handleDismissDigital}
              allCreditsAdded={false}
            />
          )}
          
          {hasNextShowSuggestion && (
            <NextShowCredits
              editor={editor}
              nextShowName={nextShowName}
              nextShowHost={nextShowHost}
              onRemoveLine={onRemoveNextShowLine}
              onCreditAdded={handleNextShowCreditAdded}
              onDismiss={handleDismissNextShow}
              allCreditsAdded={false}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ShowCredits;
