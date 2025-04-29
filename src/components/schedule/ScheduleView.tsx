
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ViewMode, ScheduleSlot } from '@/types/schedule';
import ScheduleHeader from './layout/ScheduleHeader';
import ScheduleGrid from './layout/ScheduleGrid';
import ScheduleDialogs from './ScheduleDialogs';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { useDayNotes } from './hooks/useDayNotes';
import { format, startOfWeek, addDays, isValid } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  selectedDate = new Date(), // Provide default current date
  isMasterSchedule = false, 
  hideDateControls = false, 
  hideHeaderDates = false,
  filterShowsByWeek = true,
  isAdmin = false,
  showAddButton = true
}: ScheduleViewProps) => {
  const [selectedDateState, setSelectedDate] = useState<Date>(selectedDate);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();
  const [hasLoadingError, setHasLoadingError] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Make sure we have a valid date
  useEffect(() => {
    if (!isValid(selectedDateState)) {
      console.warn('Invalid selectedDateState, resetting to current date');
      setSelectedDate(new Date());
    }
  }, [selectedDateState]);
  
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
  const { 
    scheduleSlots, 
    isLoading, 
    error: scheduleSlotsError,
    createSlot, 
    updateSlot, 
    deleteSlot,
    refetch: refetchSlots
  } = useScheduleSlots(
    selectedDateState, 
    isMasterSchedule
  );
  
  const { 
    dayNotes, 
    refreshDayNotes,
    error: dayNotesError
  } = useDayNotes(selectedDateState, viewMode);

  // Effect to detect and handle errors
  useEffect(() => {
    if (scheduleSlotsError || dayNotesError) {
      console.error('Error loading schedule data:', { scheduleSlotsError, dayNotesError });
      setHasLoadingError(true);
    } else {
      setHasLoadingError(false);
    }
  }, [scheduleSlotsError, dayNotesError]);

  // Handle retry when there's an error
  const handleRetry = () => {
    setHasLoadingError(false);
    refetchSlots();
    refreshDayNotes();
  };

  useEffect(() => {
    if (selectedDate && selectedDate !== selectedDateState && isValid(selectedDate)) {
      setSelectedDate(selectedDate);
    }
  }, [selectedDate]);

  const handleAddSlot = () => {
    setEditingSlot(undefined);
    setShowSlotDialog(true);
  };

  const handleDeleteSlot = async (slot: ScheduleSlot, e: React.MouseEvent) => {
    e.stopPropagation();

    // Skip confirmation if CTRL key is pressed
    if (e.ctrlKey) {
      await deleteSlot(slot.id);
      return;
    }
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק משבצת שידור זו?')) {
      await deleteSlot(slot.id);
    }
  };

  const handleEditSlot = (slot: ScheduleSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMasterSchedule) {
      setEditingSlot(slot);
      setShowSlotDialog(true);
    } else {
      setEditingSlot(slot);
      setShowEditModeDialog(true);
    }
  };

  const handleEditCurrent = () => {
    setShowEditModeDialog(false);
    setShowSlotDialog(true);
  };

  const handleEditAll = () => {
    setShowEditModeDialog(false);
    setShowSlotDialog(true);
  };

  const handleSaveSlot = async (slotData: any) => {
    try {
      if (slotData.id) {
        console.log("Handling update for existing slot:", slotData.id);
        const {
          id,
          ...updates
        } = slotData;
        await updateSlot({
          id,
          updates
        });
      } else {
        console.log("Creating new slot:", slotData);
        await createSlot(slotData);
      }
      setShowSlotDialog(false);
    } catch (error) {
      console.error('Error saving slot:', error);
    }
  };

  const handleSlotClick = (slot: ScheduleSlot) => {
    if (!isAuthenticated) return;
    console.log('Clicked slot details:', {
      show_name: slot.show_name,
      host_name: slot.host_name,
      start_time: slot.start_time,
      is_prerecorded: slot.is_prerecorded,
      is_collection: slot.is_collection
    });
    
    if (slot.shows && slot.shows.length > 0) {
      const show = slot.shows[0];
      console.log('Found existing show, navigating to:', show.id);
      navigate(`/show/${show.id}`);
    } else {
      try {
        const weekStart = startOfWeek(selectedDateState, { weekStartsOn: 0 });
        if (!isValid(weekStart)) {
          throw new Error('Invalid week start date');
        }
        
        const slotDate = addDays(weekStart, slot.day_of_week);
        if (!isValid(slotDate)) {
          throw new Error('Invalid slot date calculated');
        }
        
        const generatedShowName = slot.show_name === slot.host_name 
          ? slot.host_name 
          : `${slot.show_name} עם ${slot.host_name}`;
        
        console.log('Navigating to new lineup with generated name:', generatedShowName);
        navigate('/new', {
          state: {
            generatedShowName,
            showName: slot.show_name,
            hostName: slot.host_name,
            time: slot.start_time,
            date: slotDate,
            isPrerecorded: slot.is_prerecorded,
            isCollection: slot.is_collection,
            slotId: slot.id
          }
        });
      } catch (error) {
        console.error('Error generating navigation state:', error);
      }
    }
  };

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

      {hasLoadingError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription className="flex items-center justify-between">
            <span>אירעה שגיאה בטעינת לוח השידורים. אנא נסה שוב מאוחר יותר.</span>
            <Button variant="destructive" onClick={handleRetry} size="sm">נסה שוב</Button>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <ScheduleGrid 
          scheduleSlots={scheduleSlots || []}
          selectedDate={selectedDateState}
          viewMode={viewMode}
          handleSlotClick={handleSlotClick}
          handleEditSlot={handleEditSlot}
          handleDeleteSlot={handleDeleteSlot}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
          hideHeaderDates={hideHeaderDates}
          dayNotes={dayNotes || []}
          onDayNoteChange={refreshDayNotes}
        />
      )}

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

// Add a default export that references the named export
export default ScheduleView;
