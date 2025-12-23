
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
    if (manualInput.name.trim()) {
      const newInterviewee = {
        id: uuidv4(),
        item_id: itemId,
        name: manualInput.name.trim(),
        title: manualInput.title.trim(),
        phone: manualInput.phone.trim(),
        duration,
      };
      
      onAdd(newInterviewee);
      setManualInput({ name: '', title: '', phone: '' });
      onClose();
      toast.success('מרואיין נוסף בהצלחה');
    } else {
      toast.error('יש להזין שם מרואיין');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && manualInput.name.trim()) {
      handleManualAdd();
    }
  };

  return (
    <div className="space-y-3">
      {/* Search section */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">חיפוש מרואיין קיים</h4>
        <IntervieweeSearch onAdd={async (guest) => {
          try {
            const newInterviewee = {
              id: uuidv4(),
              item_id: itemId,
              name: guest.name.trim(),
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
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-50 px-2 text-gray-500">או</span>
        </div>
      </div>

      {/* Manual input section */}
      <div>
        <h4 className="text-xs font-medium text-gray-700 mb-2">הוספה ידנית</h4>
        <div className="grid grid-cols-1 gap-2">
          <Input
            placeholder="שם מרואיין *"
            autoComplete="off"
            value={manualInput.name}
            onChange={(e) => setManualInput(prev => ({ ...prev, name: e.target.value }))}
            onKeyPress={handleKeyPress}
            className="text-right text-sm"
            size={1}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="תפקיד/קרדיט"
              value={manualInput.title}
              onChange={(e) => setManualInput(prev => ({ ...prev, title: e.target.value }))}
              onKeyPress={handleKeyPress}
              className="text-right text-sm"
              size={1}
            />
            <Input
              placeholder="טלפון"
              value={manualInput.phone}
              onChange={(e) => setManualInput(prev => ({ ...prev, phone: e.target.value }))}
              onKeyPress={handleKeyPress}
              className="text-right text-sm"
              size={1}
            />
          </div>
          <Button
            onClick={handleManualAdd}
            disabled={!manualInput.name.trim()}
            className="w-full"
            size="sm"
          >
            הוסף מרואיין
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntervieweeForm;
