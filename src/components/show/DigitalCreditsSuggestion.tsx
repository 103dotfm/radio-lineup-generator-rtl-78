
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Editor } from '@tiptap/react';
import { getDigitalWorkers } from '@/lib/getDigitalWorkers';

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
        const workers = await getDigitalWorkers(showDate, showTime);
        
        if (workers.length > 0) {
          const names = workers.map(w => w.name);
          
          if (names.length === 1) {
            setDigitalCredit(`דיגיטל: ${names[0]}`);
          } else if (names.length === 2) {
            setDigitalCredit(`דיגיטל: ${names[0]} ו${names[1]}`);
          } else if (names.length > 2) {
            const allButLast = names.slice(0, names.length - 1).join(', ');
            setDigitalCredit(`דיגיטל: ${allButLast} ו${names[names.length - 1]}`);
          }
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

  if (isLoading) {
    return <div className="text-sm text-gray-500">טוען הצעת קרדיטים לדיגיטל...</div>;
  }

  if (!digitalCredit) {
    return <div className="text-sm text-gray-500">אין מידע על עובדי דיגיטל למשבצת זו</div>;
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
