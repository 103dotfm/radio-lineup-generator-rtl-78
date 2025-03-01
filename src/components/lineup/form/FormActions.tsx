
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Coffee, FileText, Divide } from 'lucide-react';

interface FormActionsProps {
  onSave: () => void;
  onCancel: () => void;
  onBreakAdd?: () => void;
  onNoteAdd?: () => void;
  onDividerAdd?: () => void;
  isEditing: boolean;
}

const FormActions = ({
  onSave,
  onCancel,
  onBreakAdd,
  onNoteAdd,
  onDividerAdd,
  isEditing,
}: FormActionsProps) => {
  return (
    <div className="flex justify-between mt-4">
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          {isEditing ? 'עדכן פריט' : 'הוסף פריט'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          <span>בטל</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {onBreakAdd && (
          <Button
            variant="outline"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onBreakAdd();
            }}
          >
            <Coffee className="ml-2 h-4 w-4" />
            <span>הוסף הפסקה</span>
          </Button>
        )}
        {onNoteAdd && (
          <Button
            variant="outline"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onNoteAdd();
            }}
          >
            <FileText className="ml-2 h-4 w-4" />
            <span>הוסף הערה</span>
          </Button>
        )}
        {onDividerAdd && (
          <Button
            variant="outline"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDividerAdd();
            }}
          >
            <Divide className="ml-2 h-4 w-4" />
            <span>הוסף חלוקה</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default FormActions;
