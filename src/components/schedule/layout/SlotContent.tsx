
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { FileCheck } from 'lucide-react';
import { getShowDisplay } from '@/utils/showDisplay';

interface SlotContentProps {
  slot: ScheduleSlot;
}

export const SlotContent: React.FC<SlotContentProps> = ({ slot }) => {
  const { displayName, displayHost } = getShowDisplay(slot.show_name, slot.host_name);
  
  return (
    <>
      <div className="flex justify-between items-start">
        <div className="font-bold">{displayName}</div>
        {slot.has_lineup && <FileCheck className="h-4 w-4 text-green-600" />}
      </div>
      {displayHost && <div className="text-sm opacity-75">{displayHost}</div>}
    </>
  );
};
