
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
  const relevantSlots = scheduleSlots.filter(
    slot => slot.day_of_week === dayIndex && isSlotStartTime(slot.start_time, time)
  );
  
  return (
    <div key={cellKey} className={`relative p-2 border-b border-r last:border-r-0 min-h-[60px] ${!isCurrentMonth ? 'bg-gray-50' : ''}`}>
      {isCurrentMonth && relevantSlots.map(slot => (
        <ScheduleGridCell 
          key={`slot-${slot.id}-${time}`}
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
