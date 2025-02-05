import React from 'react';
import { Button } from "@/components/ui/button";

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
    <div className="flex justify-between gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBreakAdd}
        >
          הוספת פרסומות
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNoteAdd}
        >
          הוספת הערה
        </Button>
      </div>
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