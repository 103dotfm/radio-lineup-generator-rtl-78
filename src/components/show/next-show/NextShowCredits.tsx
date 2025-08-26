
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Editor } from '@tiptap/react';
import { X } from 'lucide-react';
import { sanitizeRichHtml } from "@/lib/sanitize";

interface NextShowCreditsProps {
  editor: Editor;
  nextShowName: string;
  nextShowHost?: string;
  onRemoveLine?: () => void;
  onCreditAdded?: () => void;
  onDismiss?: () => void;
  allCreditsAdded?: boolean;
}

const NextShowCredits = ({
  editor,
  nextShowName,
  nextShowHost,
  onRemoveLine,
  onCreditAdded,
  onDismiss,
  allCreditsAdded
}: NextShowCreditsProps) => {
  const [isAdded, setIsAdded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const nextShowText = useMemo(() => {
    const displayName = nextShowHost
      ? `${nextShowName} עם ${nextShowHost}`
      : nextShowName;
    
    return `<strong>אחרי החדשות: </strong>${displayName}`;
  }, [nextShowName, nextShowHost]);

  // Check if current editor content already includes this credit line
  useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      setIsAdded(currentContent.includes(nextShowText));
    }
  }, [editor, nextShowText]);

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
    // Get the current editor content
    const currentContent = editor.getHTML();
    
    // Avoid adding duplicate content
    if (currentContent.includes(nextShowText)) return;
    
    // Add the text to the editor
    if (currentContent.trim() === '') {
      editor.commands.setContent(`<p>${nextShowText}</p>`);
    } else {
      editor.commands.insertContentAt(editor.state.doc.nodeSize - 2, `<p>${nextShowText}</p>`);
    }
    
    // Update state to reflect that content has been added
    setIsAdded(true);
  };

  const handleRemoveFromCredits = () => {
    // Get current content
    const currentContent = editor.getHTML();
    
    // Create a temporary DOM element to parse and modify HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentContent;
    
    // Find and remove the paragraph containing our text
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (p.textContent === nextShowText) {
        p.remove();
      }
    });
    
    // Set the modified content back to editor
    editor.commands.setContent(tempDiv.innerHTML);
    
    // Update state to reflect that content has been removed
    setIsAdded(false);
    
    // Call parent callback if provided
    if (onRemoveLine) {
      onRemoveLine();
    }
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

  if (!isVisible || allCreditsAdded) {
    return null;
  }

  return (
    <div className={`text-sm bg-white rounded p-3 border transition-all duration-250 ${isAdded ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="flex justify-between items-center">
        <div className="flex-1 text-right" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(nextShowText) }}></div>
        <div className="flex items-center space-x-2 space-x-reverse rtl shrink-0 mr-2">
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
    </div>
  );
};

export default NextShowCredits;
