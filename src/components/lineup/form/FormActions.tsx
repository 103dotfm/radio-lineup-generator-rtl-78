
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Coffee, Divide } from "lucide-react";

interface FormActionsProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBreakAdd: () => void;
  onNoteAdd: () => void;
  onDividerAdd: () => void;
  isEditing: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({
  onSubmit,
  onBreakAdd,
  onNoteAdd,
  onDividerAdd,
  isEditing
}) => {
  return <div className="flex justify-end gap-2">
      <Button type="button" onClick={onBreakAdd} variant="secondary" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200">
        <Coffee className="h-4 w-4" />
        הוספת פרסומות
      </Button>
      <Button type="button" onClick={onNoteAdd} variant="secondary" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200">
        <FileText className="h-4 w-4" />
        הוספת הערה
      </Button>
      <Button type="button" onClick={onDividerAdd} variant="secondary" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200">
        <Divide className="h-4 w-4" />
        הוספת הפרדה
      </Button>
      <Button type="submit" onClick={e => onSubmit(e)} className="text-base font-medium px-[68px]">
        {isEditing ? 'עדכון' : 'הוספה'}
      </Button>
    </div>;
};

export default FormActions;
