import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Editor } from '@tiptap/react';
import { getDigitalWorkersForShow } from '@/lib/getDigitalWorkers';
import { X } from 'lucide-react';

interface DigitalCreditsSuggestionProps {
  showDate: Date;
  showTime: string;
  editor: Editor;
  onCreditAdded?: () => void;
  onDismiss?: () => void;
  allCreditsAdded?: boolean;
}

const DigitalCreditsSuggestion = ({ 
  showDate,
  showTime, 
  editor,
  onCreditAdded,
  onDismiss,
  allCreditsAdded
}: DigitalCreditsSuggestionProps) => {
  const [digitalCredit, setDigitalCredit] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const loadDigitalWorkers = async () => {
      try {
        setIsLoading(true);
        const creditLine = await getDigitalWorkersForShow(showDate, showTime);
        
        if (creditLine) {
          // Remove trailing period if it exists
          const formattedCredit = creditLine.endsWith('.') ? creditLine.slice(0, -1) : creditLine;
          // Add strong tags to the first part (before the colon)
          const colonIndex = formattedCredit.indexOf(':');
          if (colonIndex !== -1) {
            const prefix = formattedCredit.substring(0, colonIndex + 1);
            const suffix = formattedCredit.substring(colonIndex + 1);
            setDigitalCredit(`<strong>${prefix}</strong>${suffix}`);
          } else {
            setDigitalCredit(formattedCredit);
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

  // Check if current editor content already includes this credit line
  useEffect(() => {
    if (editor && digitalCredit) {
      const currentContent = editor.getHTML();
      setIsAdded(currentContent.includes(digitalCredit));
    }
  }, [editor, digitalCredit]);

  // Effect for handling animation and visibility
  useEffect(() => {
    if (isAdded) {
      // Delay the removal from DOM to allow animation to play
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Notify parent component that a credit was added
        if (onCreditAdded) {
          onCreditAdded();
        }
      }, 250); // Match this with CSS transition duration
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isAdded, onCreditAdded]);

  const handleAddToCredits = () => {
    if (!digitalCredit) return;

    // Get the current editor content
    const currentContent = editor.getHTML();
    
    // Avoid adding duplicate content
    if (currentContent.includes(digitalCredit)) return;
    
    // Add the text to the editor
    if (currentContent.trim() === '') {
      editor.commands.setContent(`<p>${digitalCredit}</p>`);
    } else {
      editor.commands.insertContentAt(editor.state.doc.nodeSize - 2, `<p>${digitalCredit}</p>`);
    }
    
    // Update state to reflect that content has been added
    setIsAdded(true);
  };

  const handleRemoveFromCredits = () => {
    if (!digitalCredit) return;
    
    // Get current content
    const currentContent = editor.getHTML();
    
    // Create a temporary DOM element to parse and modify HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentContent;
    
    // Find and remove the paragraph containing our text
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (p.textContent === digitalCredit) {
        p.remove();
      }
    });
    
    // Set the modified content back to editor
    editor.commands.setContent(tempDiv.innerHTML);
    
    // Update state to reflect that content has been removed
    setIsAdded(false);
  };

  const handleDismiss = () => {
    // Animate out
    setIsVisible(false);
    // Call parent dismissal handler after animation completes
    setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      }
    }, 250);
  };

  if (isLoading || !digitalCredit || !isVisible || allCreditsAdded) {
    return null;
  }

  return (
    <div className={`text-sm bg-white rounded p-3 border transition-all duration-250 ${isAdded ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="flex justify-between items-center">
        <div className="space-x-2 space-x-reverse rtl">
          {!isAdded ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddToCredits}
                className="text-xs"
              >
                הוסף לקרדיטים
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRemoveFromCredits}
              className="text-xs text-red-500 hover:text-red-700"
            >
              הסר מהקרדיטים
            </Button>
          )}
        </div>
      </div>
      <div className="text-right mt-2" dangerouslySetInnerHTML={{ __html: digitalCredit }}></div>
    </div>
  );
};

export default DigitalCreditsSuggestion;
