
import { useState } from 'react';
import { ViewMode, ScheduleSlot } from '@/types/schedule';

export function useScheduleState(initialDate: Date = new Date()) {
  const [selectedDateState, setSelectedDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>((() => {
    try {
      if (typeof window !== 'undefined') {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        return isMobile ? 'daily' as ViewMode : 'weekly';
      }
    } catch {}
    return 'weekly' as ViewMode;
  })());
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
