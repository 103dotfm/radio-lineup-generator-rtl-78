import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { FileCheck } from 'lucide-react';
import { getShowDisplay } from '@/utils/showDisplay';

interface SlotContentProps {
  slot: ScheduleSlot;
  isMasterSchedule?: boolean;
}

export const SlotContent: React.FC<SlotContentProps> = ({ slot, isMasterSchedule = false }) => {
  const { displayName, displayHost } = getShowDisplay(slot.show_name, slot.host_name);
  
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="font-bold flex items-center flex-wrap">
          <span>{displayName}</span>
          {slot.is_collection && (
            <div className="inline-block slot-badge">
              לקט
            </div>
          )}
          {slot.is_recurring && (
            <div className="inline-block slot-badge">
              ש.ח.
            </div>
          )}
          {slot.is_prerecorded && (
            <div className="inline-block slot-badge">
              מוקלט
            </div>
          )}
        </div>
        {!isMasterSchedule && slot.has_lineup && slot.shows && slot.shows.length > 0 && (
          <FileCheck className="h-4 w-4 text-green-600" />
        )}
      </div>
      {displayHost && <div className="text-sm opacity-75">{displayHost}</div>}
    </>
  );
};
