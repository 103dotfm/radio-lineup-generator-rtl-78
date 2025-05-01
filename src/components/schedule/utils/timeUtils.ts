
import { addDays, startOfWeek } from 'date-fns';
import { ViewMode } from '@/types/schedule';

export const timeSlotsList = () => {
  const slots = [];
  for (let i = 6; i <= 23; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
  }
  // Removing 2am, only including 0am and 1am
  for (let i = 0; i <= 1; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

export const calculateDates = (selectedDate: Date, viewMode: ViewMode) => {
  switch (viewMode) {
    case 'daily':
      return [selectedDate];
    case 'weekly':
      {
        const startOfCurrentWeek = startOfWeek(selectedDate, {
          weekStartsOn: 0
        });
        return Array.from({
          length: 7
        }, (_, i) => addDays(startOfCurrentWeek, i));
      }
    case 'monthly':
      {
        const monthStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        return Array.from({
          length: 28
        }, (_, i) => addDays(monthStart, i));
      }
    default:
      return [];
  }
};

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isSlotStartTime = (slotStartTime: string, timeSlot: string) => {
  const slotStartMinutes = timeToMinutes(slotStartTime);
  const currentTimeMinutes = timeToMinutes(timeSlot);
  return slotStartMinutes === currentTimeMinutes;
};
