import React, { useEffect, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import NextShowEdit from './NextShowEdit';

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
  const [existingLineText, setExistingLineText] = useState<string | null>(null);
  
  // Check if editor already has a next show line and extract it
  const checkForExistingLine = useCallback(() => {
    if (!editor) return null;
    
    const content = editor.getHTML();
    const regex = /<strong>מיד אחרינו:(.*?)<\/strong>/;
    const match = content.match(regex);
    
    if (match) {
      console.log('Found existing next show line:', match[0]);
      setExistingLineText(match[0]);
      return match[0];
    }
    
    return null;
  }, [editor]);
  
  // Update component when next show info changes
  useEffect(() => {
    if (!nextShowName) {
      // If there's no next show info, hide the component
      setShowComponent(false);
      return;
    }
    
    const text = nextShowHost && nextShowName !== nextShowHost 
      ? `מיד אחרינו: ${nextShowName} עם ${nextShowHost}`
      : `מיד אחרינו: ${nextShowName}`;
    
    // Generate a unique ID for the next show
    const nextShowId = nextShowHost ? `${nextShowName}-${nextShowHost}` : nextShowName;
    
    // First check if there's an existing line
    const existingLine = checkForExistingLine();
    
    // If next show info has changed from what we previously had
    if (nextShowId !== previousNextShow) {
      console.log('Next show has changed:', nextShowId, 'vs previous:', previousNextShow);
      
      // If there's an existing line but the show info has changed, we should
      // remove the old line and suggest the new one
      if (existingLine) {
        // Only if the existing content doesn't match the new text
        if (!existingLine.includes(nextShowName)) {
          console.log('Removing old next show line and suggesting new one');
          if (editor) {
            // Remove the existing line
            removeNextShowLine();
            
            // Reset states to suggest the new line
            setApproved(false);
            setNeedsAttention(true);
            setShowComponent(true);
          }
        } else {
          // The existing line matches the current next show, so mark as approved
          setApproved(true);
          setNeedsAttention(false);
          setShowComponent(true); // Changed to true to keep showing the component
        }
      } else {
        // No existing line, suggest the new one
        setApproved(false);
        setNeedsAttention(true);
        setShowComponent(true);
      }
      
      setEditedText(text);
      setPreviousNextShow(nextShowId);
    }
  }, [nextShowName, nextShowHost, previousNextShow, editor, checkForExistingLine]);

  // Check if next show line already exists in editor on initial load
  useEffect(() => {
    if (editor && nextShowName) {
      const existingLine = checkForExistingLine();
      
      if (existingLine) {
        console.log('Next show line already exists in editor');
        // Check if the existing line matches the current next show info
        if (existingLine.includes(nextShowName)) {
          // The existing line matches, mark as approved but keep showing for edit option
          setApproved(true);
          setNeedsAttention(false);
          setShowComponent(true);
        } else {
          // The existing line doesn't match, suggest replacing it
          setApproved(false);
          setNeedsAttention(true);
          setShowComponent(true);
        }
      }
    }
  }, [editor, nextShowName, nextShowHost, checkForExistingLine]);

  const handleApprove = () => {
    if (!editor || !editedText) return;

    // First remove any existing next show line
    removeNextShowLine();
    
    // Add a line break if content already exists
    if (editor.getText().trim().length > 0) {
      // Append to the end with an empty line above
      editor.commands.focus('end');
      
      // Add two line breaks - one for empty line and one for the text
      editor.commands.insertContent('<br><br>');
      editor.commands.insertContent(`<strong>${editedText}</strong>`);
    } else {
      // If editor is empty, just insert content
      editor.commands.insertContent(`<strong>${editedText}</strong>`);
    }
    
    setApproved(true);
    setNeedsAttention(false);
    // Keep showing the component after approval so user can remove it if needed
    setShowComponent(true);
  };

  const removeNextShowLine = () => {
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
  };

  const handleRemove = () => {
    removeNextShowLine();
    
    setApproved(false);
    setNeedsAttention(true);
    // Show component after removal so user can add it again if needed
    setShowComponent(true);
    
    // Notify parent that line was removed
    if (onRemoveLine) {
      onRemoveLine();
    }
  };

  // Don't render if no next show info
  if (!nextShowName || !showComponent) {
    return null;
  }

  return (
    <Card className={`p-4 mb-4 border ${needsAttention ? 'border-orange-400 bg-orange-50' : 'border-dashed bg-muted/50'}`}>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        {needsAttention && (
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
        )}
        <NextShowEdit 
          editedText={editedText}
          setEditedText={setEditedText}
          handleApprove={handleApprove}
          approved={approved}
          handleRemove={handleRemove}
        />
      </div>
    </Card>
  );
};

export default NextShowCredits;
