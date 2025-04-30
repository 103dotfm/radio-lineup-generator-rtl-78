
import { useState } from 'react';
import { ViewMode, ScheduleSlot } from '@/types/schedule';

export function useScheduleState(initialDate: Date = new Date()) {
  const [selectedDateState, setSelectedDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();

  return {
    selectedDateState,
    setSelectedDate,
    viewMode,
    setViewMode,
    showDatePicker,
    setShowDatePicker,
    showSlotDialog,
    setShowSlotDialog,
    showEditModeDialog,
    setShowEditModeDialog,
    editingSlot,
    setEditingSlot,
  };
}
