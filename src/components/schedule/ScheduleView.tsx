
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
import { toast } from "sonner";
import { getShowWithItems } from '@/lib/supabase/shows';
import { supabase } from '@/lib/supabase';

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
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const dateRangeDisplay = `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;

  const { scheduleSlots, isLoading, createSlot, updateSlot, deleteSlot } = useScheduleSlots(
    selectedDate, 
    isMasterSchedule
  );
  
  const { dayNotes, refreshDayNotes } = useDayNotes(selectedDate, viewMode);

  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  const handleAddSlot = () => {
    setEditingSlot(undefined);
    setShowSlotDialog(true);
  };

  const handleDeleteSlot = async (slot: ScheduleSlot, e: React.MouseEvent) => {
    e.stopPropagation();

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

  const handleSlotClick = async (slot: ScheduleSlot) => {
    if (!isAuthenticated) return;
    
    console.log('Clicked slot details:', {
      id: slot.id,
      show_name: slot.show_name,
      host_name: slot.host_name,
      start_time: slot.start_time,
      is_prerecorded: slot.is_prerecorded,
      is_collection: slot.is_collection,
      has_lineup: slot.has_lineup,
      shows: slot.shows ? slot.shows.map(s => s.id) : 'none'
    });
    
    try {
      // First check if the slot has associated shows from the slot.shows property (which is populated in useScheduleSlots)
      if (slot.shows && slot.shows.length > 0 && slot.shows[0]?.id) {
        const showId = slot.shows[0].id;
        console.log(`Found associated show ${showId} for slot ${slot.id} from slot.shows`);
        
        try {
          navigate(`/show/${showId}`);
          return;
        } catch (showError) {
          console.error(`Error navigating to show ${showId}:`, showError);
        }
      } 
      
      // If we reach here, we need to create a new lineup
      console.log(`Creating new lineup for slot ${slot.id}`);
      
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const slotDate = new Date(weekStart);
      slotDate.setDate(weekStart.getDate() + slot.day_of_week);
      
      const generatedShowName = slot.show_name === slot.host_name 
        ? slot.host_name 
        : `${slot.show_name} עם ${slot.host_name}`;
      
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
      console.error("Error handling slot click:", error);
      toast.error("אירעה שגיאה בטעינת הליינאפ");
      
      // Fall back to creating a new lineup if anything goes wrong
      navigate('/new');
    }
  };

  return (
    <div className="space-y-4">
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
