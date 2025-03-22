
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
  
  // Update component when next show info changes
  useEffect(() => {
    if (nextShowName) {
      const text = nextShowHost && nextShowName !== nextShowHost 
        ? `מיד אחרינו: ${nextShowName} עם ${nextShowHost}`
        : `מיד אחרינו: ${nextShowName}`;
      
      // Generate a unique ID for the next show
      const nextShowId = nextShowHost ? `${nextShowName}-${nextShowHost}` : nextShowName;
      
      // If next show info has changed, update the component
      if (nextShowId !== previousNextShow) {
        console.log('Next show has changed:', nextShowId, 'vs previous:', previousNextShow);
        setEditedText(text);
        setNeedsAttention(true);
        setShowComponent(true);
        setApproved(false); // Reset approval status on next show change
        setPreviousNextShow(nextShowId);
      }
    }
  }, [nextShowName, nextShowHost, previousNextShow]);

  // Check if next show line already exists in editor
  useEffect(() => {
    if (editor && nextShowName) {
      const content = editor.getHTML();
      const hasNextShowLine = content.includes('מיד אחרינו:');
      
      // If already in editor and matches current next show, mark as approved
      if (hasNextShowLine) {
        console.log('Next show line already exists in editor');
        setApproved(true);
        setNeedsAttention(false);
      }
    }
  }, [editor, nextShowName]);

  const handleApprove = () => {
    if (!editor || !editedText) return;

    // Add a line break if content already exists
    if (editor.getText().trim().length > 0) {
      // Check if the editor already has a next show line
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
    
    // Clean up any standalone "מיד אחרינו" text as well
    const cleanupRegex = /<strong>מיד אחרינו:.*?<\/strong>/;
    const cleanedContent = finalContent.replace(cleanupRegex, '').trim();
    
    // Clean up consecutive break tags that might be left
    const finalCleanedContent = cleanedContent.replace(/<br><br><br>/g, '<br><br>');
    
    editor.commands.setContent(finalCleanedContent);
    setApproved(false);
    setNeedsAttention(true);
    setShowComponent(true); // Show component after removal
    
    // Notify parent that line was removed
    if (onRemoveLine) {
      onRemoveLine();
    }
  };

  // Don't render if no next show info or already approved and doesn't need attention
  if (!nextShowName || (!showComponent && approved && !needsAttention)) {
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
