
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { Interviewee } from '@/types/show';

interface ManualInputType {
  name: string;
  title: string;
  phone: string;
}

interface IntervieweeRowProps {
  interviewee: Interviewee;
  isEditing: boolean;
  manualInput: ManualInputType;
  onManualInputChange: (field: keyof ManualInputType, value: string) => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  isAuthenticated?: boolean;
}

const IntervieweeRow = ({
  interviewee,
  isEditing,
  manualInput,
  onManualInputChange,
  onStartEdit,
  onDelete,
  onSave,
  isAuthenticated
}: IntervieweeRowProps) => {
  return (
    <>
      <div className="mt-2 border-t pt-2 min-h-[3rem] flex items-center">
        {isEditing ? (
          <Input
            value={manualInput.name || interviewee.name}
            onChange={(e) => onManualInputChange('name', e.target.value)}
            className="w-full"
            onBlur={onSave}
          />
        ) : (
          <div className="flex items-center gap-2 w-full">
            <span>{interviewee.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onStartEdit}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      <div className="mt-2 border-t pt-2 min-h-[3rem] flex items-center">
        {isEditing ? (
          <Input
            value={manualInput.title || interviewee.title}
            onChange={(e) => onManualInputChange('title', e.target.value)}
            className="w-full"
          />
        ) : (
          <span>{interviewee.title}</span>
        )}
      </div>
      {isAuthenticated && (
        <div className="mt-2 border-t pt-2 min-h-[3rem] flex items-center">
          {isEditing ? (
            <Input
              value={manualInput.phone || interviewee.phone}
              onChange={(e) => onManualInputChange('phone', e.target.value)}
              className="w-full"
            />
          ) : (
            <span>{interviewee.phone}</span>
          )}
        </div>
      )}
    </>
  );
};

export default IntervieweeRow;
