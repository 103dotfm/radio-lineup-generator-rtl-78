
import React, { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NextShowCreditsProps {
  editor: Editor | null;
  nextShowName?: string;
  nextShowHost?: string;
  onRemoveLine?: () => void;
}

const NextShowCredits = ({ editor, nextShowName, nextShowHost, onRemoveLine }: NextShowCreditsProps) => {
  const [approved, setApproved] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [needsAttention, setNeedsAttention] = useState(true);
  const [showComponent, setShowComponent] = useState(true);
  const [previousNextShow, setPreviousNextShow] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (nextShowName) {
      const text = nextShowHost && nextShowName !== nextShowHost 
        ? `מיד אחרינו: ${nextShowName} עם ${nextShowHost}`
        : `מיד אחרינו: ${nextShowName}`;
      
      // Check if next show info has changed
      const nextShowId = nextShowHost ? `${nextShowName}-${nextShowHost}` : nextShowName;
      
      if (nextShowId !== previousNextShow) {
        setEditedText(text);
        setNeedsAttention(true);
        setShowComponent(true);
        setPreviousNextShow(nextShowId);
      }
    }
  }, [nextShowName, nextShowHost, previousNextShow]);

  useEffect(() => {
    // Check if the next show line already exists in the editor content
    if (editor) {
      const content = editor.getHTML();
      const hasNextShowLine = content.includes('מיד אחרינו:');
      setApproved(hasNextShowLine);
      
      // If approved and already in credits, don't need attention
      if (hasNextShowLine) {
        setNeedsAttention(false);
      }
    }
  }, [editor]);

  const handleApprove = () => {
    if (!editor || !editedText) return;

    // Add a line break if content already exists
    if (editor.getText().trim().length > 0) {
      // Check if the editor already has the next show line
      const content = editor.getHTML();
      if (content.includes('מיד אחרינו:')) {
        // Replace existing next show line
        const regex = /<strong>מיד אחרינו:.*?<\/strong>/;
        const newContent = content.replace(regex, `<strong>${editedText}</strong>`);
        editor.commands.setContent(newContent);
      } else {
        // Append to the end with an empty line above
        editor.commands.focus('end');
        
        // Add two line breaks - one for empty line and one for the text
        editor.commands.insertContent('<br><br>');
        editor.commands.insertContent(`<strong>${editedText}</strong>`);
      }
    } else {
      // If editor is empty, just insert content
      editor.commands.insertContent(`<strong>${editedText}</strong>`);
    }
    
    setApproved(true);
    setNeedsAttention(false);
    setShowComponent(false); // Hide component after approval
  };

  const handleRemove = () => {
    if (!editor) return;
    
    // Remove the next show line and the empty line above it from the editor
    const content = editor.getHTML();
    
    // More specific regex to match both the empty line and the next show line
    const regex = /<br><br><strong>מיד אחרינו:.*?<\/strong>/;
    const newContent = content.replace(regex, '');
    
    // If the pattern doesn't match with double breaks, try with single break
    const fallbackRegex = /<br><strong>מיד אחרינו:.*?<\/strong>/;
    const finalContent = regex.test(content) 
      ? newContent 
      : content.replace(fallbackRegex, '');
    
    // Clean up consecutive break tags that might be left
    const cleanedContent = finalContent.replace(/<br><br><br>/g, '<br><br>').trim();
    
    editor.commands.setContent(cleanedContent);
    setApproved(false);
    setNeedsAttention(true);
    
    // Notify parent that line was removed
    if (onRemoveLine) {
      onRemoveLine();
    }
  };

  // Hide the component if approved and doesn't need attention
  if (!showComponent && approved && !needsAttention) {
    return null;
  }

  return (
    <Card className={`p-4 mb-4 border ${needsAttention ? 'border-orange-400 bg-orange-50' : 'border-dashed bg-muted/50'}`}>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        {needsAttention && (
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
        )}
        <input
          className="flex-1 p-2 border rounded text-sm"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          disabled={approved}
          dir="rtl"
        />
        
        {approved ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRemove}
          >
            הסר מהקרדיטים
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleApprove}
          >
            <Check className="h-4 w-4 ml-2" />
            הוסף לקרדיטים
          </Button>
        )}
      </div>
    </Card>
  );
};

export default NextShowCredits;
