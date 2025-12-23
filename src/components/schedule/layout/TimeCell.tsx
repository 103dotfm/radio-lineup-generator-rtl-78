import React, { useState, useRef, useEffect } from 'react';
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
  handleCreateSlot?: (dayIndex: number, time: string, duration?: number) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isMasterSchedule?: boolean;
  deletingSlots?: Set<string>;
}

const TimeCell: React.FC<TimeCellProps> = ({
  dayIndex,
  time,
  isCurrentMonth = true,
  cellKey,
  scheduleSlots = [],
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  handleCreateSlot,
  isAdmin,
  isAuthenticated,
  isMasterSchedule = false,
  deletingSlots = new Set()
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragEndY, setDragEndY] = useState(0);
  const [dragDuration, setDragDuration] = useState(1);
  const cellRef = useRef<HTMLDivElement>(null);

  // Filter to find the correct slots for this cell and handle overrides
  const slotsMap = new Map<string, ScheduleSlot>();
  
  // First, add all non-recurring slots (they take precedence)
  scheduleSlots?.forEach(slot => {
    if (slot.day_of_week === dayIndex && isSlotStartTime(slot.start_time, time) && !slot.is_recurring) {
      const uniqueKey = `${slot.day_of_week}-${slot.start_time}`;
      slotsMap.set(uniqueKey, { ...slot, is_modified: true });
    }
  });
  
  // Then, add recurring slots only if there's no non-recurring override
  scheduleSlots?.forEach(slot => {
    if (slot.day_of_week === dayIndex && isSlotStartTime(slot.start_time, time) && slot.is_recurring) {
      const uniqueKey = `${slot.day_of_week}-${slot.start_time}`;
      if (!slotsMap.has(uniqueKey)) {
        slotsMap.set(uniqueKey, { ...slot, is_modified: false });
      }
    }
  });
  
  const relevantSlots = Array.from(slotsMap.values());
  const isEmpty = relevantSlots.length === 0;

  // Global mouse event handlers for better drag detection
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        setDragEndY(e.clientY);
        
        // Calculate duration based on drag distance
        const dragDistance = Math.abs(e.clientY - dragStartY);
        const cellHeight = 60; // Approximate cell height in pixels
        const durationHours = Math.max(1, Math.round(dragDistance / cellHeight));
        setDragDuration(durationHours);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        setIsDragging(false);
        
        if (handleCreateSlot) {
          handleCreateSlot(dayIndex, time, dragDuration);
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartY, dragEndY, dayIndex, time, handleCreateSlot, dragDuration]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAdmin || !isAuthenticated || !isEmpty || !isMasterSchedule) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragEndY(e.clientY);
    setDragDuration(1);
  };

  const getCellStyle = () => {
    if (isDragging) {
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '2px dashed #3b82f6',
        cursor: 'crosshair'
      };
    }
    return {};
  };

  // Calculate the maximum height needed for this cell based on slot durations
  const getCellHeight = () => {
    if (relevantSlots.length === 0) return 'min-h-[60px]';
    
    const maxHeight = Math.max(...relevantSlots.map(slot => {
      const start = timeToMinutes(slot.start_time);
      const end = timeToMinutes(slot.end_time);
      const hoursDiff = (end - start) / 60;
      return hoursDiff * 60; // Convert to pixels
    }));
    
    return maxHeight > 60 ? `h-[${maxHeight}px]` : 'min-h-[60px]';
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  return (
    <div 
      ref={cellRef}
      key={cellKey} 
      className={`relative p-2 border-b border-r last:border-r-0 ${getCellHeight()} ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
      style={getCellStyle()}
      onMouseDown={handleMouseDown}
    >
      {isCurrentMonth && relevantSlots.map((slot, index) => (
        <ScheduleGridCell 
          key={`schedule-slot-${slot.id}-${time}-${dayIndex}-${index}`}
          slot={slot}
          handleSlotClick={(slot) => {
        
            handleSlotClick(slot);
          }}
          handleEditSlot={(slot, e) => {
        
            handleEditSlot(slot, e);
          }}
          handleDeleteSlot={(slot, e) => {
        
            handleDeleteSlot(slot, e);
          }}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
          isMasterSchedule={isMasterSchedule}
          deletingSlots={deletingSlots}
        />
      ))}
      
      {/* Show duration indicator when dragging */}
      {isDragging && dragDuration > 1 && (
        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-xs text-center py-1 z-10">
          {dragDuration} שעות
        </div>
      )}
    </div>
  );
};

export default TimeCell;
