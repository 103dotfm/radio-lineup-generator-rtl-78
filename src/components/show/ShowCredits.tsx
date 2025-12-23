
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
    <div className="col-span-2 space-y-6 animate-in">
      <div className="relative group">
        <label className="absolute -top-3 right-6 px-2 bg-white text-xs font-black text-primary z-10 rounded-full border border-primary/10 shadow-sm">
          קרדיטים וסיכום
        </label>
        <EditorContent
          editor={editor}
          className="min-h-[120px] bg-white border border-slate-100 rounded-[1.5rem] text-center shadow-sm focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/20 transition-all overflow-hidden"
        />
        <div className="absolute bottom-3 left-4 text-[10px] font-bold text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          עורך טקסט חופשי
        </div>
      </div>

      {showSuggestionsBox && (
        <div className="space-y-4 rounded-[1.5rem] border-2 border-dashed border-slate-100 p-6 bg-slate-50/30 backdrop-blur-sm animate-in zoom-in-95">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
              ✨
            </span>
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">הצעות לקרדיטים מהירים</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasProducerSuggestion && (
              <div className="bg-white/80 p-4 rounded-xl border border-slate-100 shadow-sm">
                <ProducersCreditsComponent
                  editor={editor}
                  assignments={producerAssignments}
                  showDate={showDate}
                  showTime={showTime}
                  onCreditAdded={handleProducerCreditAdded}
                  onDismiss={handleDismissProducer}
                  allCreditsAdded={false}
                />
              </div>
            )}

            {hasDigitalSuggestion && (
              <div className="bg-white/80 p-4 rounded-xl border border-slate-100 shadow-sm">
                <DigitalCreditsSuggestion
                  showDate={showDate}
                  showTime={showTime}
                  editor={editor}
                  onCreditAdded={handleDigitalCreditAdded}
                  onDismiss={handleDismissDigital}
                  allCreditsAdded={false}
                />
              </div>
            )}

            {hasNextShowSuggestion && (
              <div className="bg-white/80 p-4 rounded-xl border border-slate-100 shadow-sm">
                <NextShowCredits
                  editor={editor}
                  nextShowName={nextShowName}
                  nextShowHost={nextShowHost}
                  onRemoveLine={onRemoveNextShowLine}
                  onCreditAdded={handleNextShowCreditAdded}
                  onDismiss={handleDismissNextShow}
                  allCreditsAdded={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowCredits;
