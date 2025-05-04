
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { SlotContent } from './SlotContent';
import { SlotActions } from './SlotActions';
import { getSlotColor, getSlotHeight } from './SlotColorHelper';

interface ScheduleGridCellProps {
  slot: ScheduleSlot;
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export default function ScheduleGridCell({
  slot,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated
}: ScheduleGridCellProps) {
  const slotClickHandler = isAuthenticated ? () => handleSlotClick(slot) : undefined;

  // Generate a stable key for this cell
  const cellKey = `slot-${slot.id}-${slot.day_of_week}-${slot.start_time}`;

  return (
    <div 
      onClick={slotClickHandler} 
      className={`p-2 rounded ${isAuthenticated ? 'cursor-pointer' : ''} hover:opacity-80 transition-colors group schedule-cell ${getSlotColor(slot)}`} 
      style={{
        height: getSlotHeight(slot),
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        zIndex: 10
      }}
      data-slot-id={slot.id}
      data-cell-key={cellKey}
    >
      <SlotContent slot={slot} />
      
      {isAdmin && (
        <SlotActions 
          slot={slot}
          handleEditSlot={handleEditSlot}
          handleDeleteSlot={handleDeleteSlot}
        />
      )}
    </div>
  );
}
