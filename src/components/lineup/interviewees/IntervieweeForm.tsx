
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import IntervieweeSearch from '../form/IntervieweeSearch';
import { toast } from 'sonner';
import { Interviewee } from '@/types/show';

interface IntervieweeFormProps {
  itemId: string;
  duration: number;
  onAdd: (newInterviewee: Interviewee) => void;
  onClose: () => void;
}

const IntervieweeForm = ({ itemId, duration, onAdd, onClose }: IntervieweeFormProps) => {
  const [manualInput, setManualInput] = useState({
    name: '',
    title: '',
    phone: ''
  });

  const handleManualAdd = () => {
    if (manualInput.name) {
      const newInterviewee = {
        id: crypto.randomUUID(),
        item_id: itemId,
        name: manualInput.name,
        title: manualInput.title,
        phone: manualInput.phone,
        duration,
      };
      
      onAdd(newInterviewee);
      setManualInput({ name: '', title: '', phone: '' });
      onClose();
      toast.success('מרואיין נוסף בהצלחה');
    }
  };

  return (
    <div className="space-y-2">
      <IntervieweeSearch onAdd={async (guest) => {
        try {
          const newInterviewee = {
            id: crypto.randomUUID(),
            item_id: itemId,
            name: guest.name,
            title: guest.title,
            phone: guest.phone,
            duration,
          };
          
          onAdd(newInterviewee);
          onClose();
          toast.success('מרואיין נוסף בהצלחה');
        } catch (error: any) {
          console.error('Error adding interviewee:', error);
          toast.error('שגיאה בהוספת מרואיין');
        }
      }} />
      <div className="text-sm text-gray-500">או הוספה ידנית:</div>
      <div className="space-y-2">
        <Input
          placeholder="שם"
          value={manualInput.name}
          onChange={(e) => setManualInput(prev => ({ ...prev, name: e.target.value }))}
        />
        <Input
          placeholder="קרדיט"
          value={manualInput.title}
          onChange={(e) => setManualInput(prev => ({ ...prev, title: e.target.value }))}
        />
        <Input
          placeholder="טלפון"
          value={manualInput.phone}
          onChange={(e) => setManualInput(prev => ({ ...prev, phone: e.target.value }))}
        />
        <Button
          onClick={handleManualAdd}
          disabled={!manualInput.name}
        >
          הוסף
        </Button>
      </div>
    </div>
  );
};

export default IntervieweeForm;
