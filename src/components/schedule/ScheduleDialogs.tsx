import React from 'react';
import ScheduleSlotDialog from './dialogs/ScheduleSlotDialog';
import EditModeDialog from './EditModeDialog';
import { ScheduleSlot } from '@/types/schedule';

interface ScheduleDialogsProps {
  isAdmin: boolean;
  showSlotDialog: boolean;
  showEditModeDialog: boolean;
  editingSlot: ScheduleSlot | null;
  isMasterSchedule?: boolean;
  selectedDate?: Date;
  onCloseSlotDialog: () => void;
  onCloseEditModeDialog: () => void;
  onEditCurrent: () => void;
  onEditAll: () => void;
  onSaveSlot: (slotData: any) => Promise<any>;
}

export default function ScheduleDialogs({
  isAdmin,
  showSlotDialog,
  showEditModeDialog,
  editingSlot,
  isMasterSchedule = false,
  selectedDate,
  onCloseSlotDialog,
  onCloseEditModeDialog,
  onEditCurrent,
  onEditAll,
  onSaveSlot
}: ScheduleDialogsProps) {
  return (
    <>
      {/* Schedule Slot Dialog */}
      <ScheduleSlotDialog
        isOpen={showSlotDialog}
        onClose={onCloseSlotDialog}
        onSave={onSaveSlot}
        editingSlot={editingSlot}
        isMasterSchedule={isMasterSchedule}
        selectedDate={selectedDate}
      />

      {/* Edit Mode Dialog - Only show for weekly schedule, not for master schedule */}
      {!isMasterSchedule && showEditModeDialog && (
        <EditModeDialog
          isOpen={showEditModeDialog}
          onClose={onCloseEditModeDialog}
          onEditCurrent={onEditCurrent}
          onEditAll={onEditAll}
        />
      )}
    </>
  );
}
