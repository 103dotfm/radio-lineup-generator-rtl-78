
import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DaySelector from './DaySelector';

interface AssignmentOptionsProps {
  isPermanent: boolean;
  setIsPermanent: (value: boolean) => void;
  selectedDays: number[];
  toggleDay: (dayId: number) => void;
}

const AssignmentOptions = ({
  isPermanent,
  setIsPermanent,
  selectedDays,
  toggleDay
}: AssignmentOptionsProps) => {
  return (
    <div className="mt-6 border-t pt-4">
      <h4 className="font-medium mb-4">אפשרויות נוספות:</h4>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="permanent-toggle">משבץ קבוע (חל על כל השבועות)</Label>
            <Switch 
              id="permanent-toggle" 
              checked={isPermanent}
              onCheckedChange={(checked) => {
                setIsPermanent(checked);
                if (checked) toggleDay(-1); // Clear selected days when selecting permanent
              }}
            />
          </div>
        </div>
        
        {!isPermanent && (
          <DaySelector 
            selectedDays={selectedDays} 
            toggleDay={toggleDay} 
            isPermanent={isPermanent} 
          />
        )}
      </div>
    </div>
  );
};

export default AssignmentOptions;
