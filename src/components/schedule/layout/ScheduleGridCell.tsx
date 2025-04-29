
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { FileCheck, Pencil, Trash2 } from 'lucide-react';
import { getShowDisplay } from '@/utils/showDisplay';

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
  const { backgroundColor, textColor } = getShowDisplay(slot);
  const hasLineup = slot.has_lineup || (slot.shows && slot.shows.length > 0);
  
  // Generate a more unique key using slot id and additional fields
  const uniqueId = `${slot.id}-${slot.day_of_week}-${slot.start_time.replace(':', '')}`;
  
  return (
    <div
      key={uniqueId}
      onClick={() => isAuthenticated && handleSlotClick(slot)}
      className={`
        flex flex-col p-2 rounded-md shadow-sm mb-1
        ${isAuthenticated ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}
        transition-all duration-200 w-full
      `}
      style={{ 
        backgroundColor: backgroundColor || (slot.color ? `var(--${slot.color})` : '#4a72e8'),
        color: textColor
      }}
    >
      <div className="flex justify-between items-start">
        <div className="font-semibold truncate">{slot.show_name}</div>
        
        {isAdmin && (
          <div className="flex space-x-1 text-white">
            <button 
              onClick={(e) => handleEditSlot(slot, e)} 
              className="p-1 hover:bg-white/20 rounded"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => handleDeleteSlot(slot, e)} 
              className="p-1 hover:bg-red-400/50 rounded"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      
      <div className="text-sm opacity-90">{slot.host_name}</div>
      
      <div className="text-xs mt-1 flex items-center space-x-1">
        <span>{slot.start_time} - {slot.end_time}</span>
        
        {slot.is_prerecorded && (
          <span className="bg-amber-200 text-amber-900 px-1 rounded text-[0.6rem]">מוקלט</span>
        )}
        
        {hasLineup && (
          <span className="ms-auto">
            <FileCheck className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
