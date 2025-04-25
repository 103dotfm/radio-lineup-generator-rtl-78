
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Editor } from '@tiptap/react';
import { Check, X } from 'lucide-react';
import { getDigitalWorkersForShow } from '@/lib/getDigitalWorkers';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { InfoIcon } from 'lucide-react';

interface DigitalCreditsSuggestionProps {
  showDate: Date | undefined;
  showTime: string;
  editor: Editor | null;
}

const DigitalCreditsSuggestion = ({ showDate, showTime, editor }: DigitalCreditsSuggestionProps) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [error, setError] = useState('');
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!showDate || !showTime) {
        setIsLoading(false);
        setHasChecked(true);
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        
        // Ensure showTime is in the correct format (HH:mm)
        let formattedShowTime = showTime;
        if (showTime.includes(':')) {
          // If it has a colon, take the first 5 characters (HH:mm)
          formattedShowTime = showTime.substring(0, 5);
        } else if (showTime.length === 4) {
          // If it's 4 digits without colon (e.g. "0900"), format it
          formattedShowTime = `${showTime.substring(0, 2)}:${showTime.substring(2, 4)}`;
        }
        
        // Extract day of week as a number (0-6, where 0 is Sunday)
        const dayOfWeek = showDate.getDay();
        
        console.log(`Fetching digital workers suggestion for ${showDate.toISOString().split('T')[0]} at ${formattedShowTime} (day ${dayOfWeek})`);
        const result = await getDigitalWorkersForShow(dayOfWeek, formattedShowTime);
        
        console.log("Digital workers suggestion result:", result);
        
        if (result) {
          setSuggestion(result);
          setEditedSuggestion(result);
        } else {
          setSuggestion(null);
        }
      } catch (err) {
        console.error('Error fetching digital workers suggestion:', err);
        setError('שגיאה בטעינת הצעה לקרדיטים לדיגיטל');
      } finally {
        setIsLoading(false);
        setHasChecked(true);
      }
    };

    fetchSuggestion();
  }, [showDate, showTime]);

  const handleApply = () => {
    if (!editor || !editedSuggestion) return;
    
    // Get current content
    const currentContent = editor.getHTML();
    
    // Append the suggestion as a new paragraph
    const updatedContent = currentContent + `<p>${editedSuggestion}</p>`;
    
    // Update editor content
    editor.commands.setContent(updatedContent);
    
    // Clear the suggestion to hide the component
    setSuggestion(null);
  };

  const handleCancel = () => {
    setSuggestion(null);
  };

  // Don't render anything if we're still loading and haven't checked yet
  if (isLoading && !hasChecked) {
    return (
      <div className="bg-gray-50 border rounded-md p-4 my-2 text-center">
        <p className="text-sm text-gray-500">טוען הצעה לקרדיטים לדיגיטל...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 my-2 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // If we've checked and there's no suggestion, show a help message
  if (hasChecked && !suggestion) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 my-2 text-center">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">אין קרדיטים לדיגיטל זמינים לתוכנית זו</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" side="left">
              <div dir="rtl" className="space-y-2 text-sm">
                <h4 className="font-medium">אודות קרדיטים לדיגיטל</h4>
                <p>הקרדיטים לדיגיטל נלקחים מסידור העבודה השבועי של מחלקת הדיגיטל.</p>
                <p>אם אין קרדיטים זמינים, יתכן שטרם נוסף המידע לסידור העבודה.</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  // If we have a suggestion, show it
  return (
    <div className="digital-credits-suggestion p-4 my-2">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-blue-800">הצעה לקרדיטים לדיגיטל:</h3>
      </div>
      
      <Textarea 
        value={editedSuggestion}
        onChange={(e) => setEditedSuggestion(e.target.value)}
        className="min-h-[60px] mb-2 bg-white text-right"
      />
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-1"
        >
          <X className="h-4 w-4" />
          ביטול
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleApply}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
        >
          <Check className="h-4 w-4" />
          הוסף לקרדיטים
        </Button>
      </div>
    </div>
  );
};

export default DigitalCreditsSuggestion;
