
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from 'lucide-react';

interface SlotActionsProps {
  slot: ScheduleSlot;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
}

export const SlotActions: React.FC<SlotActionsProps> = ({
  slot,
  handleEditSlot,
  handleDeleteSlot
}) => {
  return (
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
  );
};
