import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ViewMode, ScheduleSlot } from '@/types/schedule';
import ScheduleHeader from './layout/ScheduleHeader';
import ScheduleGrid from './layout/ScheduleGrid';
import ScheduleDialogs from './ScheduleDialogs';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { useDayNotes } from './hooks/useDayNotes';
import { format, startOfWeek, addDays } from 'date-fns';

interface ScheduleViewProps {
  isAdmin?: boolean;
  isMasterSchedule?: boolean;
  hideDateControls?: boolean;
  showAddButton?: boolean;
  hideHeaderDates?: boolean;
  selectedDate?: Date;
}

export default function ScheduleView({
  isAdmin = false,
  isMasterSchedule = false,
  hideDateControls = false,
  showAddButton = true,
  hideHeaderDates = false,
  selectedDate: externalSelectedDate
}: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(externalSelectedDate || new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Format the date range for print header
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const dateRangeDisplay = `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;

  // Use custom hooks
  const { scheduleSlots, isLoading, error, refetch, createSlot, updateSlot, deleteSlot } = useScheduleSlots(
    selectedDate, 
    isMasterSchedule
  );
  
  const { dayNotes, refreshDayNotes } = useDayNotes(selectedDate, viewMode);

  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  useEffect(() => {
    // Force refetch when the component mounts
    refetch();
  }, [refetch]);

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
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const slotDate = new Date(weekStart);
      slotDate.setDate(weekStart.getDate() + slot.day_of_week);
      
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
    }
  };

  return (
    <div className="space-y-4">
      {/* Print Header - Only visible when printing */}
      <div className="print-schedule-header">
        לוח שידורים שבועי 103fm - {dateRangeDisplay}
      </div>
      
      <ScheduleHeader 
        selectedDate={selectedDate}
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

      {isLoading ? (
        <div className="flex items-center justify-center p-12 border rounded-lg">
          <div className="text-lg">טוען לוח שידורים...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-12 border rounded-lg bg-red-50">
          <div className="text-lg text-red-500">שגיאה בטעינת לוח השידורים</div>
        </div>
      ) : scheduleSlots.length === 0 ? (
        <div className="flex items-center justify-center p-12 border rounded-lg">
          <div className="text-lg">אין משבצות שידור לתצוגה בשבוע זה</div>
        </div>
      ) : (
        <ScheduleGrid 
          scheduleSlots={scheduleSlots}
          selectedDate={selectedDate}
          viewMode={viewMode}
          handleSlotClick={handleSlotClick}
          handleEditSlot={handleEditSlot}
          handleDeleteSlot={handleDeleteSlot}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
          hideHeaderDates={hideHeaderDates}
          dayNotes={dayNotes}
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
}
