
import React from 'react';
import { Button } from "@/components/ui/button";

interface DaySelectorProps {
  selectedDays: number[];
  toggleDay: (dayId: number) => void;
  isPermanent: boolean;
}

const DaySelector = ({ selectedDays, toggleDay, isPermanent }: DaySelectorProps) => {
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  if (isPermanent) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 block">הוסף לימים נוספים בשבוע זה:</div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <Button
            key={`day-toggle-${day}`}
            type="button"
            variant={selectedDays.includes(day) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDay(day)}
            className={`${selectedDays.includes(day) ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {dayNames[day]}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default DaySelector;
