
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Editor } from '@tiptap/react';

interface NextShowCreditsProps {
  editor: Editor;
  nextShowName: string;
  nextShowHost?: string;
  onRemoveLine?: () => void;
}

const NextShowCredits = ({
  editor,
  nextShowName,
  nextShowHost,
  onRemoveLine
}: NextShowCreditsProps) => {
  const [isAdded, setIsAdded] = useState(false);

  const nextShowText = useMemo(() => {
    const displayName = nextShowHost
      ? `${nextShowName} עם ${nextShowHost}`
      : nextShowName;
    
    return `אחרי החדשות: ${displayName}`;
  }, [nextShowName, nextShowHost]);

  // Check if current editor content already includes this credit line
  React.useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      setIsAdded(currentContent.includes(nextShowText));
    }
  }, [editor, nextShowText]);

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

  return (
    <div className="text-sm bg-white rounded p-3 border">
      <div className="mb-2 flex justify-between items-center">
        <span className="font-medium">קרדיט לתוכנית הבאה:</span>
        <div className="space-x-2 space-x-reverse rtl">
          {!isAdded ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddToCredits}
              className="text-xs"
            >
              הוסף לקרדיטים
            </Button>
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
      <div className="text-right">{nextShowText}</div>
    </div>
  );
};

export default NextShowCredits;
