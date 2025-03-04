
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { ScheduleSlotForm } from "../forms/ScheduleSlotForm"

interface ScheduleSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slotData: any) => void;
  editingSlot?: any;
  isMasterSchedule?: boolean;
}

export default function ScheduleSlotDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  editingSlot,
  isMasterSchedule = false
}: ScheduleSlotDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingSlot ? 'ערוך משבצת' : 'הוסף משבצת'}</DialogTitle>
        </DialogHeader>
        <ScheduleSlotForm 
          onSubmit={onSave}
          onClose={onClose}
          editingSlot={editingSlot}
          isMasterSchedule={isMasterSchedule}
        />
      </DialogContent>
    </Dialog>
  );
}
