import React from 'react';
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
  scheduleSlots?: any[];
  refetchSlots?: () => void;
  selectedDate?: Date;
}

const ScheduleSlotDialog: React.FC<ScheduleSlotDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSlot,
  isMasterSchedule = false,
  scheduleSlots = [],
  refetchSlots,
  selectedDate
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto z-[9999] bg-white">
        <DialogHeader className="items-end text-right">
          <DialogTitle className="w-full text-right">
            {editingSlot ? 'ערוך משבצת שידור' : 'הוסף משבצת שידור'}
          </DialogTitle>
          <DialogDescription className="w-full text-right">
            {editingSlot ? 'ערוך את פרטי המשבצת' : 'הוסף משבצת חדשה ללוח הזמנים'}
          </DialogDescription>
        </DialogHeader>
        <ScheduleSlotForm 
          onSubmit={onSave}
          onClose={onClose}
          editingSlot={editingSlot}
          isMasterSchedule={isMasterSchedule}
          scheduleSlots={scheduleSlots}
          refetchSlots={refetchSlots}
          selectedDate={selectedDate}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSlotDialog;
