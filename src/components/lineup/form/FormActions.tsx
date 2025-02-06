import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Coffee } from "lucide-react";

interface FormActionsProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBreakAdd: () => void;
  onNoteAdd: () => void;
  isEditing: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({
  onSubmit,
  onBreakAdd,
  onNoteAdd,
  isEditing
}) => {
  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        onClick={onBreakAdd}
        className="flex items-center gap-2"
      >
        <Coffee className="h-4 w-4" />
        הוספת פרסומות
      </Button>
      <Button
        type="button"
        onClick={onNoteAdd}
        className="flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        הוספת הערה
      </Button>
      <Button 
        type="submit" 
        onClick={(e) => onSubmit(e)}
      >
        {isEditing ? 'עדכון' : 'הוספה'}
      </Button>
    </div>
  );
};

export default FormActions;