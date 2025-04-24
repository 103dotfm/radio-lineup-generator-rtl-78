
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { Pencil, Trash2, FileCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getShowDisplay } from '@/utils/showDisplay';

interface ScheduleGridCellProps {
  slot: ScheduleSlot;
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const ScheduleGridCell = ({
  slot,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated
}: ScheduleGridCellProps) => {
  const { displayName, displayHost } = getShowDisplay(slot.show_name, slot.host_name);
  const bgColorClass = slot.color?.toLowerCase() === 'red' ? 'bg-red-100' : 
    slot.color?.toLowerCase() === 'blue' ? 'bg-blue-100' : 
    slot.color?.toLowerCase() === 'green' ? 'bg-green-100' : 
    'bg-gray-50';
  
  return (
    <div 
      className={`schedule-slot p-2 rounded-md cursor-pointer hover:shadow-md transition-shadow relative ${bgColorClass}`}
      onClick={() => handleSlotClick(slot)}
      data-show-name={slot.show_name || ''}
      data-host-name={slot.host_name || ''}
      data-start-time={slot.start_time || ''}
      data-end-time={slot.end_time || ''}
      data-color={slot.color || ''}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </p>
          {displayHost && (
            <p className="text-xs text-gray-700 truncate">
              עם {displayHost}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
          </p>
        </div>
        
        {isAuthenticated && (
          <div className="flex items-center space-x-1 rtl:space-x-reverse ml-2">
            {slot.is_prerecorded && (
              <FileCheck 
                className="h-4 w-4 text-blue-500" 
                aria-label="תוכנית מוקלטת" 
              />
            )}
            {isAdmin && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6" 
                  onClick={(e) => handleEditSlot(slot, e)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:text-red-700" 
                  onClick={(e) => handleDeleteSlot(slot, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleGridCell;
