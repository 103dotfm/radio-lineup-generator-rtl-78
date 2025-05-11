
import React, { useMemo, useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from "@/components/ui/button";
import { ProducerAssignment } from '@/lib/supabase/producers';

interface ProducersCreditsComponentProps {
  editor: Editor;
  assignments: ProducerAssignment[];
  showDate?: Date;
  showTime?: string;
}

const ProducersCreditsComponent = ({ 
  editor, 
  assignments, 
  showDate,
  showTime 
}: ProducersCreditsComponentProps) => {
  const [isAdded, setIsAdded] = useState(false);
  
  const relevantProducers = useMemo(() => {
    if (!showDate || !showTime || assignments.length === 0) return [];

    // Filter assignments for the current date and time slot
    const dayAssignments = assignments.filter(assignment => {
      if (!assignment.slot) return false;
      
      // Check if the assignment's day matches our showDate's day of week
      const showDayOfWeek = showDate.getDay();
      return assignment.slot.day_of_week === showDayOfWeek;
    });

    // Further filter based on time slot
    return dayAssignments.filter(assignment => {
      if (!assignment.slot) return false;
      
      // Check if the time matches (checking only hours and minutes for simplicity)
      const slotTime = assignment.slot.start_time?.substring(0, 5);
      const currentTime = showTime?.substring(0, 5);
      return slotTime === currentTime;
    });
  }, [assignments, showDate, showTime]);

  // Extract editors and producers, sorted by the order in the work arrangement
  const sortedProducers = useMemo(() => {
    if (!relevantProducers.length) return [];
    
    // Create a priority map for role sorting
    const rolePriorities = {
      'עריכה': 1,
      'עורך': 1,
      'עורכת': 1,
      'הפקה': 2,
      'מפיק': 2,
      'מפיקה': 2,
    };
    
    return [...relevantProducers]
      .sort((a, b) => {
        // Sort by role priority - editors first, then producers
        const roleA = a.role?.toLowerCase() || '';
        const roleB = b.role?.toLowerCase() || '';
        
        // Check against the priority map (default to 999 if not found)
        let priorityA = 999;
        let priorityB = 999;
        
        Object.entries(rolePriorities).forEach(([key, priority]) => {
          if (roleA.includes(key.toLowerCase())) priorityA = priority;
          if (roleB.includes(key.toLowerCase())) priorityB = priority;
        });
        
        return priorityA - priorityB;
      })
      .map(assignment => ({
        name: assignment.worker?.name || '',
        role: assignment.role || ''
      }));
  }, [relevantProducers]);

  const producersText = useMemo(() => {
    if (sortedProducers.length === 0) return '';
    
    // Group producers by role
    const editorsGroup = sortedProducers.filter(p => 
      p.role.includes('עריכה') || 
      p.role.includes('עורך') || 
      p.role.includes('עורכת')
    );
    
    const producersGroup = sortedProducers.filter(p => 
      p.role.includes('הפקה') || 
      p.role.includes('מפיק') || 
      p.role.includes('מפיקה')
    );
    
    // Generate text for editors first
    let result = '';
    
    if (editorsGroup.length > 0) {
      const editorNames = editorsGroup.map(p => p.name);
      if (editorNames.length === 1) {
        result = `עריכה: ${editorNames[0]}`;
      } else if (editorNames.length === 2) {
        result = `עריכה: ${editorNames[0]} ו${editorNames[1]}`;
      } else {
        const allButLast = editorNames.slice(0, -1).join(', ');
        result = `עריכה: ${allButLast} ו${editorNames[editorNames.length - 1]}`;
      }
    }
    
    // Add producers text
    if (producersGroup.length > 0) {
      const producerNames = producersGroup.map(p => p.name);
      const producerText = producerNames.length === 1 
        ? `הפקה: ${producerNames[0]}`
        : producerNames.length === 2
          ? `הפקה: ${producerNames[0]} ו${producerNames[1]}`
          : `הפקה: ${producerNames.slice(0, -1).join(', ')} ו${producerNames[producerNames.length - 1]}`;
      
      result = result ? `${result}\n${producerText}` : producerText;
    }
    
    return result;
  }, [sortedProducers]);

  // Check if current editor content already includes this credit line
  useEffect(() => {
    if (editor && producersText) {
      const currentContent = editor.getHTML();
      setIsAdded(currentContent.includes(producersText));
    }
  }, [editor, producersText]);

  const handleAddToCredits = () => {
    if (!producersText) return;

    // Get the current editor content
    const currentContent = editor.getHTML();
    
    // Avoid adding duplicate content
    if (currentContent.includes(producersText)) return;
    
    // Split the producers text by lines if it contains both editors and producers
    const lines = producersText.split('\n');
    
    // Add the text to the editor
    if (currentContent.trim() === '') {
      // Create a paragraph for each line
      const content = lines.map(line => `<p>${line}</p>`).join('');
      editor.commands.setContent(content);
    } else {
      // Add each line as a separate paragraph
      lines.forEach(line => {
        editor.commands.insertContentAt(editor.state.doc.nodeSize - 2, `<p>${line}</p>`);
      });
    }
    
    // Update state to reflect that content has been added
    setIsAdded(true);
  };

  const handleRemoveFromCredits = () => {
    if (!producersText) return;
    
    // Get current content
    const currentContent = editor.getHTML();
    
    // Create a temporary DOM element to parse and modify HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentContent;
    
    // Split the producers text by lines
    const lines = producersText.split('\n');
    
    // Find and remove each paragraph containing our text lines
    const paragraphs = tempDiv.querySelectorAll('p');
    lines.forEach(line => {
      paragraphs.forEach(p => {
        if (p.textContent === line) {
          p.remove();
        }
      });
    });
    
    // Set the modified content back to editor
    editor.commands.setContent(tempDiv.innerHTML);
    
    // Update state to reflect that content has been removed
    setIsAdded(false);
  };

  if (!producersText) {
    return null;
  }

  return (
    <div className="text-sm bg-white rounded p-3 border">
      <div className="mb-2 flex justify-between items-center">
        <span className="font-medium">קרדיט למפיקים:</span>
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
      <div className="text-right whitespace-pre-line">{producersText}</div>
    </div>
  );
};

export default ProducersCreditsComponent;
