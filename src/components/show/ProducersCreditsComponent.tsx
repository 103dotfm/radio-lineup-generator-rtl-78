import React, { useMemo, useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from "@/components/ui/button";
import { ProducerAssignment } from '@/lib/supabase/producers';
import { X } from 'lucide-react';

interface ProducersCreditsComponentProps {
  editor: Editor;
  assignments: ProducerAssignment[];
  showDate?: Date;
  showTime?: string;
  onCreditAdded?: () => void;
  onDismiss?: () => void;
  allCreditsAdded?: boolean;
}

const ProducersCreditsComponent = ({ 
  editor, 
  assignments, 
  showDate,
  showTime,
  onCreditAdded,
  onDismiss,
  allCreditsAdded
}: ProducersCreditsComponentProps) => {
  const [isAdded, setIsAdded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const relevantProducers = useMemo(() => {
    if (!showDate || !showTime || assignments.length === 0) return [];

    // Filter assignments for the current date and time slot
    const dayAssignments = assignments.filter(assignment => {
      if (!assignment.slot) return false;
      
      // Check if the assignment's day matches our showDate's day of week
      const showDayOfWeek = showDate.getDay();
      const assignmentDayOfWeek = assignment.slot.day_of_week;
      
      console.log('Comparing days:', {
        showDay: showDayOfWeek,
        assignmentDay: assignmentDayOfWeek,
        slotTime: assignment.slot.start_time,
        showTime: showTime,
        assignmentId: assignment.id,
        workerName: assignment.worker?.name,
        role: assignment.role
      });
      
      return assignmentDayOfWeek === showDayOfWeek;
    });

    console.log('Day assignments:', dayAssignments);

    // Further filter based on time slot
    const timeAssignments = dayAssignments.filter(assignment => {
      if (!assignment.slot) return false;
      
      // Check if the time matches (checking only hours and minutes for simplicity)
      const slotTime = assignment.slot.start_time?.substring(0, 5);
      const currentTime = showTime?.substring(0, 5);
      
      console.log('Comparing times:', {
        slotTime,
        currentTime,
        matches: slotTime === currentTime,
        assignmentId: assignment.id,
        workerName: assignment.worker?.name
      });
      
      return slotTime === currentTime;
    });

    console.log('Time filtered assignments:', timeAssignments);
    
    return timeAssignments;
  }, [assignments, showDate, showTime]);

  // Categorize producers while preserving original order
  const sortedProducers = useMemo(() => {
    if (!relevantProducers.length) return [];
    
    // Create a priority map for role categorization (not for sorting)
    const roleCategories = {
      'עריכה': 'editor',
      'עורך': 'editor',
      'עורכת': 'editor',
      'הפקה': 'producer',
      'מפיק': 'producer',
      'מפיקה': 'producer',
    };
    
    // Don't sort by role - but categorize for display and keep original order
    return relevantProducers.map((assignment, index) => {
      // Determine category
      let category = 'other';
      const roleLC = (assignment.role || '').toLowerCase();
      
      Object.entries(roleCategories).forEach(([key, value]) => {
        if (roleLC.includes(key.toLowerCase())) category = value;
      });
      
      return {
        name: assignment.worker?.name || '',
        role: assignment.role || '',
        category,
        // Store the actual index from the original array to preserve order
        originalIndex: index
      };
    });
  }, [relevantProducers]);

  const producersText = useMemo(() => {
    if (sortedProducers.length === 0) return '';
    
    // Get all producers preserving original order
    const allProducers = [...sortedProducers].sort((a, b) => a.originalIndex - b.originalIndex);
    const producerNames = allProducers.map(p => p.name);
    
    // Single producer case - show with role
    if (producerNames.length === 1) {
      const producer = allProducers[0];
      const rolePrefix = producer.category === 'editor' ? 'עריכה' : 'הפקה';
      return `<strong>${rolePrefix}: </strong>${producer.name}`;
    }
    
    // Multiple producers (2+) - use "עורכים ומפיקים" prefix
    if (producerNames.length === 2) {
      return `<strong>עורכים ומפיקים: </strong>${producerNames[0]} ו${producerNames[1]}`;
    } else {
      const allButLast = producerNames.slice(0, -1).join(', ');
      return `<strong>עורכים ומפיקים: </strong>${allButLast} ו${producerNames[producerNames.length - 1]}`;
    }
  }, [sortedProducers]);

  // Check if current editor content already includes this credit line
  useEffect(() => {
    if (editor && producersText) {
      const currentContent = editor.getHTML();
      setIsAdded(currentContent.includes(producersText));
    }
  }, [editor, producersText]);

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

  if (!producersText || !isVisible || allCreditsAdded) {
    return null;
  }

  return (
    <div className={`text-sm bg-white rounded p-3 border transition-all duration-250 ${isAdded ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="flex justify-between items-center">
        <div className="flex-1 text-right whitespace-pre-line" dangerouslySetInnerHTML={{ __html: producersText }}></div>
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

export default ProducersCreditsComponent;
