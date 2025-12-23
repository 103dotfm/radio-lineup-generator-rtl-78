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
  isMasterSchedule?: boolean;
  deletingSlots?: Set<string>;
}

export default function ScheduleGridCell({
  slot,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated,
  isMasterSchedule = false,
  deletingSlots = new Set()
}: ScheduleGridCellProps) {
  // Only enable click handler if authenticated AND not in master schedule
  const slotClickHandler = isAuthenticated && !isMasterSchedule ? () => handleSlotClick(slot) : undefined;

  // Generate a stable key for this cell
  const cellKey = `slot-${slot.id}-${slot.day_of_week}-${slot.start_time}`;
  
  // Check if this slot is being deleted
  const isDeleting = deletingSlots.has(slot.id);
  
  // Debug logging
  if (isDeleting) {
    console.log('🎭 Applying slide-out animation to slot:', slot.id, 'Classes:', isDeleting ? 'opacity-0 scale-50 -translate-x-full rotate-12' : 'opacity-100 scale-100 translate-x-0 rotate-0');
  }

  return (
    <div 
      onClick={slotClickHandler} 
      className={`p-2 rounded ${isAuthenticated && !isMasterSchedule ? 'cursor-pointer' : ''} hover:opacity-80 transition-all duration-500 ease-in-out group schedule-cell ${getSlotColor(slot)} ${isDeleting ? 'opacity-0 scale-50 -translate-x-full rotate-12' : 'opacity-100 scale-100 translate-x-0 rotate-0'}`} 
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
      <SlotContent slot={slot} isMasterSchedule={isMasterSchedule} />
      
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
