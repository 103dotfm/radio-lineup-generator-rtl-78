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
          // Try to load this show to verify it exists
          const result = await getShowWithItems(showId);
          if (result && result.show && result.show.id) {
            console.log(`Verified show ${showId} exists, navigating...`);
            navigate(`/show/${showId}`);
            return;
          } else {
            console.warn(`Show ${showId} not found during verification`);
          }
        } catch (showError) {
          console.error(`Error verifying show ${showId}:`, showError);
        }
      } 
      
      // Fallback: Query the database directly if slot.shows is not available or verification failed
      if (slot.has_lineup === true) {
        console.log("Slot has has_lineup=true, searching for shows with slot_id:", slot.id);
        
        const { data: shows, error: showError } = await supabase
          .from('shows_backup')
          .select('id')
          .eq('slot_id', slot.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (showError) {
          console.error('Error finding show for slot:', showError);
          throw showError;
        }
        
        if (shows && shows.length > 0 && shows[0].id) {
          const showId = shows[0].id;
          console.log(`Found show ID ${showId} for slot ${slot.id} from direct query`);
          
          try {
            const result = await getShowWithItems(showId);
            if (result && result.show && result.show.id) {
              console.log(`Navigating to existing show: ${showId}`);
              navigate(`/show/${showId}`);
              return;
            } else {
              console.warn(`Show ${showId} found but has invalid data`, result);
            }
          } catch (loadError) {
            console.error(`Error loading show ${showId}:`, loadError);
          }
        } else {
          console.warn(`Slot ${slot.id} marked as has_lineup=true but no show found in db query`);
          
          // Fix inconsistency by updating has_lineup to false
          try {
            const { error: updateError } = await supabase
              .from('schedule_slots_old')
              .update({ has_lineup: false })
              .eq('id', slot.id);
              
            if (updateError) {
              console.error(`Error fixing has_lineup flag for slot ${slot.id}:`, updateError);
            } else {
              console.log(`Fixed has_lineup flag for slot ${slot.id} to false`);
            }
          } catch (updateError) {
            console.error(`Error updating has_lineup flag:`, updateError);
          }
        }
      }

      // If we reach here, create a new lineup
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
