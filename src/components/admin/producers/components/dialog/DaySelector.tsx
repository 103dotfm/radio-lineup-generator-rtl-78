
import React from 'react';
import { Button } from "@/components/ui/button";

interface DaySelectorProps {
  selectedDays: number[];
  toggleDay: (dayId: number) => void;
  isPermanent?: boolean;
  currentDay?: number; // Add this prop to match what's being passed
}

const DaySelector = ({ selectedDays, toggleDay, isPermanent, currentDay }: DaySelectorProps) => {
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
            className={`${selectedDays.includes(day) ? 'bg-primary text-primary-foreground' : ''} ${day === currentDay ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={day === currentDay} // Disable button for the current day
          >
            {dayNames[day]}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default DaySelector;
