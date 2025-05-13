
import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScheduleSlot } from '@/types/schedule';
import DaySelector from './DaySelector';

interface AssignmentOptionsProps {
  isPermanent: boolean;
  setIsPermanent: (isPermanent: boolean) => void;
  selectedDays: number[];
  toggleDay: (day: number) => void;
  currentSlot: ScheduleSlot | null;
}

const AssignmentOptions = ({
  isPermanent,
  setIsPermanent,
  selectedDays,
  toggleDay,
  currentSlot
}: AssignmentOptionsProps) => {
  // If currentSlot is null, don't display the component
  if (!currentSlot) {
    return null;
  }

  return (
    <div className="border rounded-md p-4">
      <h3 className="text-lg font-medium mb-4">אפשרויות שיבוץ</h3>
      
      <div className="flex items-center justify-between mb-4">
        <Label htmlFor="permanent-assignment">שיבוץ קבוע</Label>
        <Switch 
          id="permanent-assignment"
          checked={isPermanent} 
          onCheckedChange={setIsPermanent}
        />
      </div>
      
      {isPermanent && (
        <>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div>
              <Label>בחר ימים נוספים לשיבוץ</Label>
              <p className="text-sm text-muted-foreground mb-2">
                השיבוץ יחול בכל שבוע ביום {currentSlot.day_of_week}, וגם בימים שתבחר למטה
              </p>
              <DaySelector 
                selectedDays={selectedDays} 
                toggleDay={toggleDay}
                currentDay={currentSlot.day_of_week}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignmentOptions;
