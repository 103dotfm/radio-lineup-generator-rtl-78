import { ScheduleSlot } from '@/types/schedule';

export const getSlotColor = (slot: ScheduleSlot): string => {
  // console.log('Getting color for slot:', {
  //   name: slot.show_name,
  //   color: slot.color,
  //   is_prerecorded: slot.is_prerecorded,
  //   is_collection: slot.is_collection,
  //   is_modified: slot.is_modified
  // });

  if (slot.color && slot.color !== 'default') {
    // console.log('Using user-selected color:', slot.color);
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

  if (slot.is_prerecorded) {
    // console.log('Using prerecorded color: purple');
    return 'bg-[#D3E4FD]'; // Blue for prerecorded
  }

  if (slot.is_collection) {
    // console.log('Using collection color: teal');
    return 'bg-[#D3E4FD]'; // Blue for collection
  }

  if (slot.is_modified) {
    // console.log('Using modified color: orange');
    return 'bg-[#FEF7CD]'; // Yellow for modified
  }

  // console.log('Using default color: green');
  return 'bg-[#eff4ec]'; // Default green
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
