
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ManualIntervieweeFormProps {
  manualInput: {
    name: string;
    title: string;
    phone: string;
  };
  onInputChange: (field: keyof typeof manualInput, value: string) => void;
  onAdd: () => void;
}

const ManualIntervieweeForm = ({
  manualInput,
  onInputChange,
  onAdd
}: ManualIntervieweeFormProps) => {
  return (
    <div className="space-y-2">
      <Input
        placeholder="שם"
        value={manualInput.name}
        onChange={(e) => onInputChange('name', e.target.value)}
      />
      <Input
        placeholder="קרדיט"
        value={manualInput.title}
        onChange={(e) => onInputChange('title', e.target.value)}
      />
      <Input
        placeholder="טלפון"
        value={manualInput.phone}
        onChange={(e) => onInputChange('phone', e.target.value)}
      />
      <Button
        onClick={onAdd}
        disabled={!manualInput.name}
      >
        הוסף
      </Button>
    </div>
  );
};

export default ManualIntervieweeForm;
