
import React, { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Check } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
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
  
  useEffect(() => {
    if (nextShowName) {
      const text = nextShowHost && nextShowName !== nextShowHost 
        ? `מיד אחרינו: ${nextShowName} עם ${nextShowHost}`
        : `מיד אחרינו: ${nextShowName}`;
      
      setEditedText(text);
    }
  }, [nextShowName, nextShowHost]);

  useEffect(() => {
    // Check if the next show line already exists in the editor content
    if (editor) {
      const content = editor.getHTML();
      const hasNextShowLine = content.includes('מיד אחרינו:');
      setApproved(hasNextShowLine);
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
        // Append to the end
        editor.commands.focus('end');
        
        // Check if we need to add a line break first
        if (editor.getText().trim().length > 0) {
          editor.commands.insertContent('<br><br>');
        }
        
        editor.commands.insertContent(`<strong>${editedText}</strong>`);
      }
    } else {
      // If editor is empty, just insert content
      editor.commands.insertContent(`<strong>${editedText}</strong>`);
    }
    
    setApproved(true);
  };

  const handleRemove = () => {
    if (!editor) return;
    
    // Remove the next show line from the editor
    const content = editor.getHTML();
    const regex = /<strong>מיד אחרינו:.*?<\/strong>/;
    const newContent = content.replace(regex, '');
    
    // Clean up consecutive break tags that might be left
    const cleanedContent = newContent.replace(/<br><br><br>/g, '<br><br>').trim();
    
    editor.commands.setContent(cleanedContent);
    setApproved(false);
    
    // Notify parent that line was removed
    if (onRemoveLine) {
      onRemoveLine();
    }
  };

  if (!nextShowName) return null;

  return (
    <Card className="p-4 mb-4 border border-dashed bg-muted/50">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox 
            id="approve-next-show"
            checked={approved}
            onCheckedChange={(checked) => {
              if (checked) {
                handleApprove();
              } else {
                handleRemove();
              }
            }}
          />
          <label 
            htmlFor="approve-next-show" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            הוסף מידע על התוכנית הבאה לקרדיטים
          </label>
        </div>
        
        <div className="pl-6 rtl:pr-6 rtl:pl-0">
          <div className="flex flex-col space-y-2">
            <input
              className="p-2 border rounded text-sm w-full"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              disabled={approved}
              dir="rtl"
            />
            
            {approved ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="self-start"
                onClick={handleRemove}
              >
                הסר מהקרדיטים
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="self-start"
                onClick={handleApprove}
              >
                <Check className="h-4 w-4 ml-2" />
                הוסף לקרדיטים
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NextShowCredits;
