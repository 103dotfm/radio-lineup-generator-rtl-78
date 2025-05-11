
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Editor } from '@tiptap/react';
import { getDigitalWorkersForShow } from '@/lib/getDigitalWorkers';

interface DigitalCreditsSuggestionProps {
  showDate: Date;
  showTime: string;
  editor: Editor;
}

const DigitalCreditsSuggestion = ({ 
  showDate,
  showTime, 
  editor 
}: DigitalCreditsSuggestionProps) => {
  const [digitalCredit, setDigitalCredit] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadDigitalWorkers = async () => {
      try {
        setIsLoading(true);
        const creditLine = await getDigitalWorkersForShow(showDate, showTime);
        
        if (creditLine) {
          setDigitalCredit(creditLine);
        } else {
          setDigitalCredit('');
        }
      } catch (error) {
        console.error('Error loading digital workers:', error);
        setDigitalCredit('');
      } finally {
        setIsLoading(false);
      }
    };

    if (showDate && showTime) {
      loadDigitalWorkers();
    }
  }, [showDate, showTime]);

  const handleAddToCredits = () => {
    if (!digitalCredit) return;

    const currentContent = editor.getHTML();
    
    // Avoid adding duplicate content
    if (currentContent.includes(digitalCredit)) return;
    
    if (currentContent.trim() === '') {
      editor.commands.setContent(`<p>${digitalCredit}</p>`);
    } else {
      editor.commands.insertContentAt(editor.getHTML().length, `<p>${digitalCredit}</p>`);
    }
  };

  if (isLoading || !digitalCredit) {
    return null;
  }

  return (
    <div className="text-sm bg-white rounded p-3 border">
      <div className="mb-2 flex justify-between items-center">
        <span className="font-medium">קרדיט לדיגיטל:</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddToCredits}
          className="text-xs"
        >
          הוסף לקרדיטים
        </Button>
      </div>
      <div className="text-right">{digitalCredit}</div>
    </div>
  );
};

export default DigitalCreditsSuggestion;
