
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
    <div className="space-y-1 mt-2 text-right">
      {interviewees.map((interviewee) => (
        <div key={interviewee.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-100 last:border-b-0">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
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
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onDelete(interviewee.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <span className="font-medium">{interviewee.name}</span>
        </div>
      ))}
    </div>
  );
};

export default IntervieweeList;
