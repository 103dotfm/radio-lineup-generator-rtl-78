
import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { Interviewee } from '@/types/show';

interface IntervieweeListProps {
  interviewees: Interviewee[];
  onEdit: (intervieweeId: string, updatedData: Partial<Interviewee>) => void;
  onDelete: (intervieweeId: string) => void;
}

const IntervieweeList = ({ interviewees, onEdit, onDelete }: IntervieweeListProps) => {
  return (
    <div className="space-y-2">
      {interviewees.map((interviewee) => (
        <div key={interviewee.id} className="flex items-center justify-between gap-2 py-1">
          <span>{interviewee.name}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(interviewee.id, {
                name: prompt('שם חדש:', interviewee.name) || interviewee.name,
                title: prompt('תפקיד חדש:', interviewee.title) || interviewee.title,
                phone: prompt('טלפון חדש:', interviewee.phone) || interviewee.phone,
              })}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(interviewee.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IntervieweeList;
