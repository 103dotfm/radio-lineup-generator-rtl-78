import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Coffee, StickyNote } from "lucide-react";

interface FormActionsProps {
  onSubmit: () => void;
  onBreakAdd: () => void;
  onNoteAdd: () => void;
  isEditing: boolean;
}

const FormActions = ({ onSubmit, onBreakAdd, onNoteAdd, isEditing }: FormActionsProps) => {
  return (
    <div className="lineup-form-actions flex gap-2">
      <Button onClick={onSubmit} className="flex-1 lineup-form-submit">
        <Plus className="ml-2 h-4 w-4" /> {isEditing ? 'עדכן פריט' : 'הוסף לליינאפ'}
      </Button>
      <Button 
        type="button" 
        onClick={onBreakAdd} 
        variant="secondary" 
        className="w-auto lineup-form-break"
      >
        <Coffee className="ml-2 h-4 w-4" /> הוסף הפסקה
      </Button>
      <Button 
        type="button" 
        onClick={onNoteAdd} 
        variant="secondary" 
        className="w-auto lineup-form-note"
      >
        <StickyNote className="ml-2 h-4 w-4" /> הוספת הערה
      </Button>
    </div>
  );
};

export default FormActions;