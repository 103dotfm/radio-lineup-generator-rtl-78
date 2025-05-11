
import React from 'react';
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
  const nextShowText = React.useMemo(() => {
    const displayName = nextShowHost
      ? `${nextShowName} עם ${nextShowHost}`
      : nextShowName;
    
    return `אחרי החדשות: ${displayName}`;
  }, [nextShowName, nextShowHost]);

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
  };

  return (
    <div className="text-sm bg-white rounded p-3 border">
      <div className="mb-2 flex justify-between items-center">
        <span className="font-medium">קרדיט לתוכנית הבאה:</span>
        <div className="space-x-2 space-x-reverse rtl">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddToCredits}
            className="text-xs"
          >
            הוסף לקרדיטים
          </Button>
          {onRemoveLine && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRemoveLine}
              className="text-xs text-red-500 hover:text-red-700"
            >
              הסר
            </Button>
          )}
        </div>
      </div>
      <div className="text-right">{nextShowText}</div>
    </div>
  );
};

export default NextShowCredits;
