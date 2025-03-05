
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { Button } from "@/components/ui/button";
import { FileCheck, Pencil, Trash2 } from 'lucide-react';
import { getShowDisplay } from '@/utils/showDisplay';

interface ScheduleGridCellProps {
  slot: ScheduleSlot;
  onClick?: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export default function ScheduleGridCell({
  slot,
  onClick,
  onEdit,
  onDelete,
  isAdmin,
  isAuthenticated
}: ScheduleGridCellProps) {
  const getSlotColor = (slot: ScheduleSlot) => {
    // First priority: user-selected color (if explicitly set)
    if (slot.color) {
      switch (slot.color) {
        case 'green':
          return 'bg-[#eff4ec]';
        case 'yellow':
          return 'bg-[#FEF7CD]';
        case 'blue':
          return 'bg-[#D3E4FD]';
        default:
          return 'bg-[#eff4ec]';
      }
    }

    // Second priority: prerecorded or collection (blue)
    if (slot.is_prerecorded || slot.is_collection) {
      return 'bg-[#D3E4FD]';
    }

    // Third priority: modified from master schedule (yellow)
    if (slot.is_modified) {
      return 'bg-[#FEF7CD]';
    }

    // Default: regular programming (green)
    return 'bg-[#eff4ec]';
  };

  const getSlotHeight = (slot: ScheduleSlot) => {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    const durationMinutes = end - start;
    // Set a minimum height
    return `${Math.max(durationMinutes / 3, 40)}px`;
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const { displayName, displayHost } = getShowDisplay(slot.show_name, slot.host_name);
  const slotClickHandler = isAuthenticated && onClick ? onClick : undefined;

  return (
    <div 
      onClick={slotClickHandler} 
      className={`p-2 rounded mb-1 ${isAuthenticated ? 'cursor-pointer' : ''} hover:opacity-80 transition-colors group schedule-cell ${getSlotColor(slot)}`} 
      style={{
        height: getSlotHeight(slot),
      }}
    >
      <div className="flex justify-between items-start">
        <div className="font-bold text-sm truncate">{displayName}</div>
        {slot.has_lineup && <FileCheck className="h-4 w-4 text-green-600 shrink-0" />}
      </div>
      {displayHost && <div className="text-xs opacity-75 truncate">{displayHost}</div>}
      
      {isAdmin && (
        <div className="actions opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 h-6 w-6" 
            onClick={e => onEdit(e)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 h-6 w-6 hover:bg-red-100" 
            onClick={e => onDelete(e)}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
}
