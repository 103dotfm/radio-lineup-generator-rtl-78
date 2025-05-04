
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { isSlotStartTime } from '../utils/timeUtils';
import ScheduleGridCell from './ScheduleGridCell';

interface TimeCellProps {
  dayIndex: number;
  time: string;
  isCurrentMonth?: boolean;
  cellKey: string;
  scheduleSlots: ScheduleSlot[];
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const TimeCell: React.FC<TimeCellProps> = ({
  dayIndex,
  time,
  isCurrentMonth = true,
  cellKey,
  scheduleSlots,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated
}) => {
  // Filter to find the correct slots for this cell and remove duplicates
  const slotsMap = new Map<string, ScheduleSlot>();
  
  scheduleSlots.forEach(slot => {
    if (slot.day_of_week === dayIndex && isSlotStartTime(slot.start_time, time)) {
      const uniqueKey = `${slot.id}-${slot.show_name}-${slot.host_name}`;
      if (!slotsMap.has(uniqueKey)) {
        slotsMap.set(uniqueKey, slot);
      }
    }
  });
  
  const relevantSlots = Array.from(slotsMap.values());
  
  return (
    <div key={cellKey} className={`relative p-2 border-b border-r last:border-r-0 min-h-[60px] ${!isCurrentMonth ? 'bg-gray-50' : ''}`}>
      {isCurrentMonth && relevantSlots.map((slot, index) => (
        <ScheduleGridCell 
          key={`schedule-slot-${slot.id}-${time}-${dayIndex}-${index}-${Date.now()}`}
          slot={slot}
          handleSlotClick={handleSlotClick}
          handleEditSlot={handleEditSlot}
          handleDeleteSlot={handleDeleteSlot}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
};

export default TimeCell;
