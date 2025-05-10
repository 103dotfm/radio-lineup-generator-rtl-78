
import { useState } from 'react';

export const useDaySelection = () => {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isPermanent, setIsPermanent] = useState(false);

  // Handle day selection properly
  const toggleDay = (dayId: number) => {
    if (dayId === -1) {
      // Special case to clear all days
      setSelectedDays([]);
      return;
    }

    setSelectedDays(current => 
      current.includes(dayId) 
        ? current.filter(id => id !== dayId) 
        : [...current, dayId]
    );
  };

  const resetDaySelection = () => {
    setSelectedDays([]);
    setIsPermanent(false);
  };

  return {
    selectedDays,
    isPermanent,
    setIsPermanent,
    toggleDay,
    resetDaySelection
  };
};
