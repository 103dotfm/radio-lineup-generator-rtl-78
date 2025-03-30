
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { Button } from "@/components/ui/button";
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
  const getSlotColor = (slot: ScheduleSlot) => {
    console.log('Getting color for slot:', {
      name: slot.show_name,
      color: slot.color,
      is_prerecorded: slot.is_prerecorded,
      is_collection: slot.is_collection,
      is_modified: slot.is_modified,
      has_lineup: slot.has_lineup
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

  const getSlotHeight = (slot: ScheduleSlot) => {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    const hoursDiff = (end - start) / 60;
    return `${hoursDiff * 60}px`;
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const { displayName, displayHost } = getShowDisplay(slot.show_name, slot.host_name);
  const slotClickHandler = isAuthenticated ? () => handleSlotClick(slot) : undefined;
  
  // Check if the slot has a connected show properly
  const hasValidLineup = slot.has_lineup && 
    slot.shows && 
    Array.isArray(slot.shows) && 
    slot.shows.length > 0 && 
    slot.shows[0]?.id;

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
      data-has-lineup={hasValidLineup ? 'true' : 'false'}
    >
      <div className="flex justify-between items-start">
        <div className="font-bold">{displayName}</div>
        {hasValidLineup && <FileCheck className="h-4 w-4 text-green-600" />}
      </div>
      {displayHost && <div className="text-sm opacity-75">{displayHost}</div>}
      
      {isAdmin && (
        <div className="actions">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 h-8 w-8" 
            onClick={e => handleEditSlot(slot, e)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 h-8 w-8 hover:bg-red-100" 
            onClick={e => handleDeleteSlot(slot, e)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
}
