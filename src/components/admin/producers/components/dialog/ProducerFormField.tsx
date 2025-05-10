
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ProducerFormFieldProps {
  index: number;
  workerId: string;
  role: string;
  additionalText?: string;
  updateForm: (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => void;
  producers: any[];
  roles: any[];
}

const ProducerFormField = ({
  index,
  workerId,
  role,
  additionalText,
  updateForm,
  producers,
  roles
}: ProducerFormFieldProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div>
        <Label htmlFor={`worker-${index}`} className="mb-2 block">עובד {index + 1}</Label>
        <Select 
          value={workerId} 
          onValueChange={(value) => updateForm(index, 'workerId', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="בחר עובד" />
          </SelectTrigger>
          <SelectContent>
            {producers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id}>
                {worker.name} 
                {worker.position && (
                  <span className="text-gray-500 text-sm"> ({worker.position})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="text"
          value={additionalText || ""}
          onChange={(e) => updateForm(index, 'additionalText', e.target.value)}
          placeholder="הערות נוספות..."
          className="w-full mt-2 p-2 border rounded text-sm"
        />
      </div>
      <div className="pt-9">
        <Select 
          value={role} 
          onValueChange={(value) => updateForm(index, 'role', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="בחר תפקיד" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProducerFormField;
