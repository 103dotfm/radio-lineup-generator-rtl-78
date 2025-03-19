
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <DialogContent className="sm:max-w-[425px] z-[9999] bg-white">
        <DialogHeader>
          <DialogTitle>{editingSlot ? 'ערוך משבצת' : 'הוסף משבצת'}</DialogTitle>
          <DialogDescription>
            {editingSlot ? 'ערוך את פרטי המשבצת' : 'הוסף משבצת חדשה ללוח הזמנים'}
          </DialogDescription>
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
