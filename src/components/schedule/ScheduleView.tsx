
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleSlot } from '@/types/schedule';
import { format, isValid, startOfWeek, addDays } from 'date-fns';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { useDayNotes } from './hooks/useDayNotes';
import { useScheduleState } from './hooks/useScheduleState';
import { useScheduleHandlers } from './hooks/useScheduleHandlers';
import ScheduleHeader from './layout/ScheduleHeader';
import ScheduleGrid from './layout/ScheduleGrid';
import ScheduleDialogs from './ScheduleDialogs';

interface ScheduleViewProps {
  selectedDate?: Date;
  isMasterSchedule?: boolean;
  hideDateControls?: boolean;
  hideHeaderDates?: boolean;
  filterShowsByWeek?: boolean;
  isAdmin?: boolean;
  showAddButton?: boolean;
}

export const ScheduleView = ({ 
  selectedDate = new Date(),
  isMasterSchedule = false, 
  hideDateControls = false, 
  hideHeaderDates = false,
  filterShowsByWeek = true,
  isAdmin = false,
  showAddButton = true
}: ScheduleViewProps) => {
  const { isAuthenticated } = useAuth();
  
  const {
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
  } = useScheduleState(selectedDate);

  // Format the date range for print header with validity check
  let dateRangeDisplay = '';
  try {
    if (isValid(selectedDateState)) {
      const weekStart = startOfWeek(selectedDateState, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      
      if (isValid(weekStart) && isValid(weekEnd)) {
        dateRangeDisplay = `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
      } else {
        console.error("Invalid week start/end dates calculated");
        dateRangeDisplay = "Invalid date range";
      }
    } else {
      console.error("Invalid selectedDateState:", selectedDateState);
      dateRangeDisplay = "Invalid date range";
    }
  } catch (error) {
    console.error("Error formatting date range:", error);
    dateRangeDisplay = "Invalid date range";
  }

  // Use custom hooks
  const { scheduleSlots, isLoading } = useScheduleSlots(selectedDateState);
  
  const { dayNotes, refreshDayNotes } = useDayNotes(selectedDateState, viewMode);

  React.useEffect(() => {
    if (selectedDate && selectedDate !== selectedDateState && isValid(selectedDate)) {
      setSelectedDate(selectedDate);
    }
  }, [selectedDate, selectedDateState, setSelectedDate]);

  // Creating a dummy deleteSlot function that returns a Promise to match the expected signature
  const deleteSlotFunction = async (id: string): Promise<void> => {
    console.log("Delete slot functionality needs implementation for ID:", id);
    return Promise.resolve();
  };

  const {
    handleAddSlot,
    handleDeleteSlot,
    handleEditSlot,
    handleSlotClick,
    handleEditCurrent,
    handleEditAll
  } = useScheduleHandlers(
    selectedDateState,
    setShowSlotDialog,
    setEditingSlot,
    setShowEditModeDialog,
    isAuthenticated,
    deleteSlotFunction // Pass the function that matches the expected signature
  );

  const handleSaveSlot = async (slotData: any) => {
    try {
      // This functionality was previously dependent on createSlot and updateSlot
      // Since we've removed those from the hook, we need to handle it differently
      console.log("Save slot functionality needs implementation:", slotData);
      setShowSlotDialog(false);
    } catch (error) {
      console.error('Error saving slot:', error);
    }
  };

  // Wrap the edit slot handler to include isMasterSchedule
  const wrappedEditSlotHandler = (slot: ScheduleSlot, e: React.MouseEvent) => 
    handleEditSlot(slot, e, isMasterSchedule);

  return (
    <div className="space-y-4">
      {/* Print Header - Only visible when printing */}
      <div className="print-schedule-header">
        לוח שידורים שבועי 103fm - {dateRangeDisplay}
      </div>
      
      <ScheduleHeader 
        selectedDate={selectedDateState}
        setSelectedDate={setSelectedDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        handleAddSlot={handleAddSlot}
        isAdmin={isAdmin}
        showAddButton={showAddButton}
        hideDateControls={hideDateControls}
      />

      <ScheduleGrid 
        scheduleSlots={scheduleSlots}
        selectedDate={selectedDateState}
        viewMode={viewMode}
        handleSlotClick={handleSlotClick}
        handleEditSlot={wrappedEditSlotHandler}
        handleDeleteSlot={handleDeleteSlot}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        hideHeaderDates={hideHeaderDates}
        dayNotes={dayNotes}
        onDayNoteChange={refreshDayNotes}
      />

      <ScheduleDialogs 
        isAdmin={isAdmin}
        showSlotDialog={showSlotDialog}
        showEditModeDialog={showEditModeDialog}
        editingSlot={editingSlot}
        isMasterSchedule={isMasterSchedule}
        onCloseSlotDialog={() => {
          setShowSlotDialog(false);
          setEditingSlot(undefined);
        }}
        onCloseEditModeDialog={() => setShowEditModeDialog(false)}
        onEditCurrent={handleEditCurrent}
        onEditAll={handleEditAll}
        onSaveSlot={handleSaveSlot}
      />
    </div>
  );
};

export default ScheduleView;
