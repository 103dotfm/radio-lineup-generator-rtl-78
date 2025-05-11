
import React, { useMemo } from 'react';
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
  // Sort producers by name for easier selection
  const sortedProducers = useMemo(() => {
    // Make a defensive copy to avoid null/undefined issues
    return [...(producers || [])].sort((a, b) => {
      // Handle potential missing names
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [producers]);
  
  // Debug
  console.log(`ProducerFormField: Got ${producers?.length || 0} producers, displaying ${sortedProducers.length} sorted producers`);
  
  return (
    <div className="grid grid-cols-2 gap-3 mb-5" dir="rtl">
      <div>
        <Label htmlFor={`worker-${index}`} className="mb-2 block text-right">עובד {index + 1}</Label>
        <Select 
          value={workerId} 
          onValueChange={(value) => updateForm(index, 'workerId', value)}
        >
          <SelectTrigger className="w-full text-right">
            <SelectValue placeholder="בחר עובד" />
          </SelectTrigger>
          <SelectContent className="bg-white" align="end">
            {!sortedProducers || sortedProducers.length === 0 ? (
              <div className="p-2 text-center text-muted-foreground">אין עובדים זמינים</div>
            ) : (
              sortedProducers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id} className="text-right">
                  {worker.name} 
                  {worker.position && (
                    <span className="text-gray-500 text-sm"> ({worker.position})</span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Input
          type="text"
          value={additionalText || ""}
          onChange={(e) => updateForm(index, 'additionalText', e.target.value)}
          placeholder="הערות נוספות..."
          className="w-full mt-2 p-2 border rounded text-sm text-right"
          dir="rtl"
        />
      </div>
      <div className="pt-9">
        <Select 
          value={role} 
          onValueChange={(value) => updateForm(index, 'role', value)}
        >
          <SelectTrigger className="text-right">
            <SelectValue placeholder="בחר תפקיד" />
          </SelectTrigger>
          <SelectContent className="bg-white" align="end">
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id} className="text-right">
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
