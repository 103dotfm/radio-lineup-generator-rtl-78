
import React from 'react';
import EditModeDialog from './EditModeDialog';
import ScheduleSlotDialog from './dialogs/ScheduleSlotDialog';
import { ScheduleSlot } from '@/types/schedule';

interface ScheduleDialogsProps {
  isAdmin: boolean;
  showSlotDialog: boolean;
  showEditModeDialog: boolean;
  editingSlot?: ScheduleSlot;
  isMasterSchedule: boolean;
  onCloseSlotDialog: () => void;
  onCloseEditModeDialog: () => void;
  onEditCurrent: () => void;
  onEditAll: () => void;
  onSaveSlot: (slotData: any) => Promise<void>;
}

const ScheduleDialogs = ({
  isAdmin,
  showSlotDialog,
  showEditModeDialog,
  editingSlot,
  isMasterSchedule,
  onCloseSlotDialog,
  onCloseEditModeDialog,
  onEditCurrent,
  onEditAll,
  onSaveSlot
}: ScheduleDialogsProps) => {
  if (!isAdmin) return null;

  return (
    <>
      <EditModeDialog 
        isOpen={showEditModeDialog} 
        onClose={onCloseEditModeDialog} 
        onEditCurrent={onEditCurrent} 
        onEditAll={onEditAll} 
      />

      <ScheduleSlotDialog 
        isOpen={showSlotDialog} 
        onClose={onCloseSlotDialog} 
        onSave={onSaveSlot} 
        editingSlot={editingSlot} 
        isMasterSchedule={isMasterSchedule} 
      />
    </>
  );
};

export default ScheduleDialogs;
