
import React, { useMemo } from 'react';
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
    
    return [...relevantProducers]
      .sort((a, b) => {
        // Sort by role display order if available
        if (a.role && b.role) {
          // For simplicity, we'll prioritize editing roles
          if (a.role.includes('עריכה') && !b.role.includes('עריכה')) return -1;
          if (!a.role.includes('עריכה') && b.role.includes('עריכה')) return 1;
        }
        return 0;
      })
      .map(assignment => ({
        name: assignment.worker?.name || '',
        role: assignment.role || ''
      }));
  }, [relevantProducers]);

  const producersText = useMemo(() => {
    if (sortedProducers.length === 0) return '';
    
    // Look for common roles to determine if we need a unified credit
    const hasEditors = sortedProducers.some(p => 
      p.role.includes('עריכה') || p.role.toLowerCase().includes('editing')
    );
    const hasProducers = sortedProducers.some(p => 
      p.role.includes('הפקה') || p.role.toLowerCase().includes('producer')
    );
    
    // If we have both editors and producers, use unified credit
    const needsUnifiedCredit = hasEditors && hasProducers && sortedProducers.length > 1;
    
    if (needsUnifiedCredit || sortedProducers.length > 1) {
      const names = sortedProducers.map(p => p.name);
      
      if (names.length === 2) {
        return `עורכים ומפיקים: ${names[0]} ו${names[1]}`;
      } else {
        // For 3 or more names
        const lastIndex = names.length - 1;
        const allButLast = names.slice(0, lastIndex).join(', ');
        return `עורכים ומפיקים: ${allButLast} ו${names[lastIndex]}`;
      }
    } else if (sortedProducers.length === 1) {
      // Single producer with their specific role
      return `${sortedProducers[0].role}: ${sortedProducers[0].name}`;
    }
    
    return '';
  }, [sortedProducers]);

  const handleAddToCredits = () => {
    if (!producersText) return;

    // Get the current editor content
    const currentContent = editor.getHTML();
    
    // Avoid adding duplicate content
    if (currentContent.includes(producersText)) return;
    
    // Add the text to the editor
    if (currentContent.trim() === '') {
      editor.commands.setContent(`<p>${producersText}</p>`);
    } else {
      editor.commands.insertContentAt(editor.state.doc.nodeSize - 2, `<p>${producersText}</p>`);
    }
  };

  if (!producersText) {
    return null;
  }

  return (
    <div className="text-sm bg-white rounded p-3 border">
      <div className="mb-2 flex justify-between items-center">
        <span className="font-medium">קרדיט למפיקים:</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddToCredits}
          className="text-xs"
        >
          הוסף לקרדיטים
        </Button>
      </div>
      <div className="text-right">{producersText}</div>
    </div>
  );
};

export default ProducersCreditsComponent;
