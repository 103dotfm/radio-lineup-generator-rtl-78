
// src/components/schedule/layout/ScheduleGridCell.tsx
// This update ensures we show slots correctly based on whether they're from master schedule or not

import React from 'react';
import { Pencil, Trash2, FileCheck } from 'lucide-react';
import { ScheduleSlot } from '@/types/schedule';

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
  // Determine background color based on slot properties
  const getSlotColor = () => {
    if (slot.color) {
      return `bg-${slot.color}-100 hover:bg-${slot.color}-200`;
    }
    return 'bg-green-100 hover:bg-green-200';
  };

  // Flag to show if this is from master schedule or a specific show
  const isFromMasterSchedule = slot.fromMaster === true;
  const hasLineup = slot.has_lineup === true;

  return (
    <div 
      className={`slot-container p-2 mb-1 rounded-md cursor-pointer ${getSlotColor()} transition-colors text-xs md:text-sm`}
      onClick={() => handleSlotClick(slot)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-bold text-xs md:text-sm">{slot.show_name}</div>
          {slot.host_name && (
            <div className="text-gray-700 text-xs">{slot.host_name}</div>
          )}
          <div className="text-gray-700 text-xs">
            {slot.start_time}
            {slot.end_time && ` - ${slot.end_time}`}
          </div>
        </div>
        
        {isAdmin && isAuthenticated && (
          <div className="flex space-x-1">
            <button 
              onClick={(e) => handleEditSlot(slot, e)} 
              className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
              title="ערוך משבצת"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => handleDeleteSlot(slot, e)} 
              className="p-1 text-gray-600 hover:text-red-600 transition-colors"
              title="מחק משבצת"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      
      {/* Indicators */}
      <div className="flex mt-1 gap-1">
        {hasLineup && (
          <span 
            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded"
            title="יש ליינאפ"
          >
            <FileCheck className="h-2 w-2 mr-0.5" />
            <span className="text-[0.6rem]">ליינאפ</span>
          </span>
        )}
        
        {isFromMasterSchedule && (
          <span 
            className="inline-flex items-center bg-purple-100 text-purple-800 text-xs px-1 py-0.5 rounded"
            title="מלוח ראשי"
          >
            <span className="text-[0.6rem]">לוח ראשי</span>
          </span>
        )}
        
        {slot.is_prerecorded && (
          <span 
            className="inline-flex items-center bg-yellow-100 text-yellow-800 text-xs px-1 py-0.5 rounded"
            title="מוקלט מראש"
          >
            <span className="text-[0.6rem]">מוקלט</span>
          </span>
        )}
        
        {slot.is_collection && (
          <span 
            className="inline-flex items-center bg-green-100 text-green-800 text-xs px-1 py-0.5 rounded"
            title="אוסף"
          >
            <span className="text-[0.6rem]">אוסף</span>
          </span>
        )}
      </div>
    </div>
  );
}
