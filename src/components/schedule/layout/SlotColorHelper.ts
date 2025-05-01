
import { ScheduleSlot } from '@/types/schedule';

export const getSlotColor = (slot: ScheduleSlot): string => {
  console.log('Getting color for slot:', {
    name: slot.show_name,
    color: slot.color,
    is_prerecorded: slot.is_prerecorded,
    is_collection: slot.is_collection,
    is_modified: slot.is_modified
  });

  // First priority: user-selected color (if explicitly set)
  if (slot.color) {
    console.log('Using user-selected color:', slot.color);
    switch (slot.color) {
      case 'green':
        return 'bg-[#eff4ec]';
      case 'yellow':
        return 'bg-[#FEF7CD]';
      case 'blue':
        return 'bg-[#D3E4FD]';
      case 'red':
        return 'bg-[#FFDEE2]';
      default:
        return 'bg-[#eff4ec]';
    }
  }

  // Second priority: prerecorded or collection (blue)
  if (slot.is_prerecorded || slot.is_collection) {
    console.log('Using blue for prerecorded/collection');
    return 'bg-[#D3E4FD]';
  }

  // Third priority: modified from master schedule (yellow)
  if (slot.is_modified) {
    console.log('Using yellow for modified slot');
    return 'bg-[#FEF7CD]';
  }

  // Default: regular programming (green)
  console.log('Using default green color');
  return 'bg-[#eff4ec]';
};

export const getSlotHeight = (slot: ScheduleSlot): string => {
  const start = timeToMinutes(slot.start_time);
  const end = timeToMinutes(slot.end_time);
  const hoursDiff = (end - start) / 60;
  return `${hoursDiff * 60}px`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
