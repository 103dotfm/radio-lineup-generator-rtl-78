import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ScheduleSlot, ViewMode } from '@/types/schedule';
import { format, isValid, startOfWeek, addDays } from 'date-fns';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { useDayNotes } from './hooks/useDayNotes';
import { useScheduleState } from './hooks/useScheduleState';
import { useScheduleHandlers } from './hooks/useScheduleHandlers';
import ScheduleHeader from './layout/ScheduleHeader';
import ScheduleGrid from './layout/ScheduleGrid';
import ScheduleDialogs from './ScheduleDialogs';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';

interface ScheduleViewProps {
  selectedDate?: Date;
  isMasterSchedule?: boolean;
  hideDateControls?: boolean;
  hideHeaderDates?: boolean;
  filterShowsByWeek?: boolean;
  isAdmin?: boolean;
  showAddButton?: boolean;
  containerHeight?: string;
}

export const ScheduleView = ({ 
  selectedDate = new Date(),
  isMasterSchedule = false, 
  hideDateControls = false, 
  hideHeaderDates = false,
  filterShowsByWeek = true,
  isAdmin = false,
  showAddButton = true,
  containerHeight
}: ScheduleViewProps) => {
  const { isAuthenticated, isAdmin: authIsAdmin, user } = useAuth();
  // Producer is authenticated but not admin - allow any authenticated non-admin user to see notes
  const isProducer = isAuthenticated && !authIsAdmin;
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [displayedSlots, setDisplayedSlots] = useState<ScheduleSlot[]>([]);
  const [deletingSlots, setDeletingSlots] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSlotSaving, setIsSlotSaving] = useState(false);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  
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

  const queryClient = useQueryClient();

  // If in daily mode and initial date is week-start (e.g., Sunday), default to today once
  useEffect(() => {
    try {
      if (viewMode === 'daily' && selectedDateState) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentStr = format(selectedDateState, 'yyyy-MM-dd');
        // On switching INTO daily view, ensure we don't snap back if already on a different day
        if (todayStr === currentStr) {
          setSelectedDate(new Date());
        }
      }
    } catch {}
  }, [viewMode]);

  // Remember scroll position when component mounts and on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!isSlotSaving && !shouldRestoreScroll) {
        setScrollPosition(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSlotSaving, shouldRestoreScroll]);

  // Save scroll position when opening the edit dialog
  useEffect(() => {
    if (showSlotDialog && editingSlot) {
      setIsEditing(true);
      setScrollPosition(window.scrollY);
  
    } else if (!showSlotDialog) {
      setIsEditing(false);
    }
  }, [showSlotDialog, editingSlot]);

  // Force scroll restoration after data changes
  useLayoutEffect(() => {
    if (shouldRestoreScroll && scrollPosition > 0) {
  
      
      // Use setTimeout to ensure this happens after React has finished rendering
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'instant'
        });
        setShouldRestoreScroll(false);
      }, 0);
    }
  }, [forceRefreshKey, displayedSlots, shouldRestoreScroll, scrollPosition]);

  // When editing is complete, trigger scroll restoration
  useEffect(() => {
    if (isSlotSaving && !showSlotDialog) {
  
      setShouldRestoreScroll(true);
      setIsSlotSaving(false);
    }
  }, [isSlotSaving, showSlotDialog]);

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
    slots: scheduleSlots, 
    loading: isLoading, 
    createSlot, 
    updateSlot, 
    deleteSlot: hookDeleteSlot,
    refreshSlots 
  } = useScheduleSlots(
    selectedDateState, 
    isMasterSchedule
  );
  
  // Update displayed slots when schedule slots change
  useEffect(() => {

    setDisplayedSlots(scheduleSlots);
    
    // If we just saved a slot and have schedule slots, restore scroll position
    if (isSlotSaving && scheduleSlots.length > 0) {
      setShouldRestoreScroll(true);
    }
  }, [scheduleSlots, isSlotSaving]);
  
  const { dayNotes, bottomNotes, refreshDayNotes, refreshBottomNotes } = useDayNotes(selectedDateState, viewMode);

  // Update selected date from parent only when day actually changes (avoid jitter)
  useEffect(() => {
    try {
      if (!selectedDate || !isValid(selectedDate) || !isValid(selectedDateState)) return;
      const incoming = format(selectedDate, 'yyyy-MM-dd');
      const current = format(selectedDateState, 'yyyy-MM-dd');
      if (incoming !== current) {
        setSelectedDate(selectedDate);
      }
    } catch {}
  }, [selectedDate]);

  const handleManualRefresh = async () => {

    // Save scroll position before refreshing
    setScrollPosition(window.scrollY);
    setForceRefreshKey(prev => prev + 1);
    await refreshSlots();
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
    async (slot: ScheduleSlot) => {
      console.log('Deleting slot:', slot);
      
      // Check if this is a virtual slot (has parent_slot_id but might not exist in DB)
      const slotInDisplayedSlots = displayedSlots.find(s => s.id === slot.id);
      
      // Debug: Check if there are any slots with similar IDs
      const similarSlots = displayedSlots.filter(s => s.id.includes(slot.id.substring(0, 8)) || slot.id.includes(s.id.substring(0, 8)));
      
      console.log('Checking if slot is virtual:', {
        slotId: slot.id,
        parent_slot_id: slot.parent_slot_id,
        is_master: slot.is_master,
        slot_date: slot.slot_date,
        displayedSlotsCount: displayedSlots.length,
        slotInDisplayedSlots: !!slotInDisplayedSlots,
        slotIsVirtual: slotInDisplayedSlots?.is_virtual,
        slotDetails: slotInDisplayedSlots,
        similarSlots: similarSlots.map(s => ({ id: s.id, show_name: s.show_name, is_master: s.is_master, parent_slot_id: s.parent_slot_id })),
        allSlotIds: displayedSlots.map(s => s.id).slice(0, 5) // First 5 IDs for debugging
      });
      
      // A slot is virtual if:
      // 1. It has a parent_slot_id (generated from master schedule)
      // 2. It's not a master slot itself
      // 3. It's NOT found in the displayedSlots (meaning it doesn't exist in the database)
      // Only slots that are generated on-the-fly from master schedule are virtual
      // 
      // TEMPORARY FIX: If slot has a real UUID (36 characters with dashes), treat it as real
      const hasRealUUID = slot.id && slot.id.length === 36 && slot.id.includes('-');
      const isVirtualSlot = hasRealUUID ? false : (slot.parent_slot_id && slot.is_master === false && !slotInDisplayedSlots);
      
      console.log('UUID Detection Debug:', {
        slotId: slot.id,
        slotIdLength: slot.id?.length,
        hasDashes: slot.id?.includes('-'),
        hasRealUUID: hasRealUUID,
        isVirtualSlot: isVirtualSlot
      });
      
      console.log('Virtual slot detection result:', isVirtualSlot);
      
      // FORCE REAL SLOT DELETION: If slot has UUID, always delete directly
      if (hasRealUUID) {
        console.log('Slot has real UUID, deleting directly via API');
        
        // Start fade-out animation
        console.log('🎬 Starting fade animation for slot:', slot.id);
        setDeletingSlots(prev => new Set(prev).add(slot.id));
        
        try {
          // Call the API directly to avoid triggering refresh
          const { deleteScheduleSlot } = await import('@/lib/api/schedule');
          await deleteScheduleSlot(slot.id, isMasterSchedule, selectedDateState, slot);
          
          console.log('Slot deleted successfully');
          
          // Start animation first, then remove from state after animation completes
          setTimeout(() => {
            setDisplayedSlots(prev => prev.filter(s => s.id !== slot.id));
            setDeletingSlots(prev => {
              const newSet = new Set(prev);
              newSet.delete(slot.id);
              return newSet;
            });
          }, 500); // Match CSS animation duration
          
        } catch (error) {
          console.error('Error in direct deletion:', error);
          alert('Error deleting slot. Please try again.');
          
          // Remove from deleting state on error
          setDeletingSlots(prev => {
            const newSet = new Set(prev);
            newSet.delete(slot.id);
            return newSet;
          });
        }
        return;
      }
      
      if (isVirtualSlot) {
        console.log('Detected virtual slot for deletion, creating deletion override');
        
        // For virtual slots, create a deletion override slot
        // This will prevent the master slot from showing for this specific date
        const deletionOverride = {
          parent_slot_id: slot.parent_slot_id,
          slot_date: slot.slot_date,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          show_name: `[DELETED] ${slot.show_name}`,
          host_name: slot.host_name,
          is_master: false,
          is_deleted: true // Mark as deleted to hide it
        };
        
        await createSlot(deletionOverride, {
          onSuccess: async () => {
            console.log('Deletion override created successfully');
            await refreshSlots();
            setForceRefreshKey(prev => prev + 1);
          },
          onError: (error) => {
            console.error('Error creating deletion override:', error);
            throw error;
          }
        });
      } else {
        // Regular slot deletion
        await hookDeleteSlot(slot.id, {
          onSuccess: async () => {
            const weekStartDate = startOfWeek(selectedDateState, { weekStartsOn: 0 });
            await queryClient.invalidateQueries({
              queryKey: ['scheduleSlots', weekStartDate.toISOString(), isMasterSchedule]
            });
            console.log('Slot deleted successfully, cache invalidated for:', weekStartDate.toISOString());
            
            // Force refresh
            await refreshSlots();
            setForceRefreshKey(prev => prev + 1);
          },
          onError: (error) => {
            console.error('Error deleting slot:', error);
            
            // Check if this is a virtual slot error from the backend
            console.log('Error details:', {
              errorMessage: error?.message,
              responseData: error?.response?.data,
              isVirtualSlot: error?.response?.data?.isVirtualSlot,
              messageIncludesVirtual: error?.message?.includes('Virtual slot not found')
            });
            
            if (error?.response?.data?.isVirtualSlot || error?.message?.includes('Virtual slot not found')) {
              console.log('Backend detected virtual slot, creating deletion override');
              
              // Create deletion override
              const deletionOverride = {
                parent_slot_id: slot.parent_slot_id,
                slot_date: slot.slot_date,
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
                show_name: `[DELETED] ${slot.show_name}`,
                host_name: slot.host_name,
                is_master: false,
                is_deleted: true
              };
              
              return createSlot(deletionOverride, {
                onSuccess: async () => {
                  console.log('Deletion override created successfully');
                  await refreshSlots();
                  setForceRefreshKey(prev => prev + 1);
                },
                onError: (overrideError) => {
                  console.error('Error creating deletion override:', overrideError);
                  throw overrideError;
                }
              });
            } else {
              throw error;
            }
          }
        });
      }
    }
  );

  const handleSaveSlot = async (slotData: any) => {
    try {
      setScrollPosition(window.scrollY);
      setIsSlotSaving(true);
      console.log('Saving scroll position before update:', window.scrollY);

      const weekStartDate = startOfWeek(selectedDateState, { weekStartsOn: 0 });
      const dayOfWeek = slotData.day_of_week;
      const startTime = slotData.start_time;
      console.log(`Saving slot for day_of_week: ${dayOfWeek}, start_time: ${startTime}, week starting: ${weekStartDate.toISOString()}`);
      console.log(`Day mapping check - day_of_week from data: ${dayOfWeek}, selected week start: ${weekStartDate.toISOString().substring(0, 10)}, expected day in week: ${addDays(weekStartDate, dayOfWeek).toISOString().substring(0, 10)}`);

      const existingSlot = displayedSlots.find(
        slot => slot.day_of_week === dayOfWeek && 
                slot.start_time === startTime &&
                slot.id !== (slotData.id || '')
      );

      if (existingSlot && !isMasterSchedule) {
        console.log(`Slot already exists at day ${dayOfWeek}, time ${startTime} for this week. Cannot create or update.`);
        alert(`A slot already exists for this day and time in the selected week: ${existingSlot.show_name} at ${existingSlot.start_time}. Please edit the existing slot or choose a different time.`);
        setIsSlotSaving(false);
        return;
      }

      // --- VIRTUAL SLOT DETECTION ---
      // A virtual slot is one that is generated on-the-fly from a master slot
      // It has a parent_slot_id (points to a master slot) but doesn't exist as a real DB row
      // We can detect this by checking if the slot has a parent_slot_id and is_master=false
      // AND if it's not in the current displayedSlots (meaning it's not a real override)
      let isVirtualSlot = false;
      
      if (slotData.parent_slot_id && slotData.is_master === false) {
        // This is a master-generated slot (has parent_slot_id)
        // Check if it's a real override (exists in displayedSlots) or virtual (generated on-the-fly)
        const isRealOverride = displayedSlots.some(s => s.id === slotData.id);
        
        if (!isRealOverride) {
          isVirtualSlot = true;
          console.log('Detected virtual slot (master-generated, not in database), will create new override slot');
        } else {
          console.log('Detected real override slot (master-generated, exists in database)');
        }
      } else {
        console.log('Detected regular slot (no parent_slot_id or is_master=true)');
      }
      
      // Additional check: if we're in weekly schedule mode and the slot has a parent_slot_id,
      // and we can't find it in the database, it's likely a virtual slot
      if (!isMasterSchedule && slotData.parent_slot_id && slotData.is_master === false) {
        const slotExistsInDB = displayedSlots.some(s => s.id === slotData.id && !s.is_virtual);
        if (!slotExistsInDB) {
          isVirtualSlot = true;
          console.log('Additional virtual slot detection: slot has parent_slot_id but not found in DB');
        }
      }

      if (slotData.id && !isVirtualSlot) {
        // Normal update for real slot
        console.log("Handling update for existing slot:", slotData.id, "with data:", slotData);
        const {
          id,
          created_at,
          updated_at,
          ...updates
        } = slotData;
        
        try {
          await updateSlot(id, updates, {
            onSuccess: async (data) => {
              console.log('Slot updated successfully:', data);
              await queryClient.invalidateQueries({
                queryKey: ['scheduleSlots', weekStartDate.toISOString(), isMasterSchedule]
              });
              await refreshSlots();
              setForceRefreshKey(prev => prev + 1);
              setShouldRestoreScroll(true);
              // setShowSlotDialog(false); // Don't close dialog here - let the form handle it
            },
            onError: (error) => {
              console.error('Error updating slot:', error);
              throw error; // Re-throw to be caught by the try-catch
            }
          });
        } catch (error) {
          console.error('Error in update attempt:', error);
          
          // Check if this is a virtual slot error
          if (error?.response?.data?.isVirtualSlot || error?.message?.includes('Virtual slot not found')) {
            console.log('Detected virtual slot error, switching to create mode');
            isVirtualSlot = true;
            // Continue to the creation logic below
          } else {
            alert('Error updating slot. Please try again.');
            setIsSlotSaving(false);
            return;
          }
        }
      }
      
      if (isVirtualSlot || !slotData.id) {
        // If virtual slot, strip id and create a new weekly slot (override)
        let slotToCreate = { ...slotData };
        if (isVirtualSlot) {
          delete slotToCreate.id;
          // Ensure is_master is false and parent_slot_id is set
          slotToCreate.is_master = false;
          // parent_slot_id should already be set
        }
        console.log("Creating new slot with payload:", slotToCreate);
        await createSlot(slotToCreate, {
          onSuccess: async (data) => {
            console.log('New slot creation successful, response data:', data);
            await queryClient.invalidateQueries({
              queryKey: ['scheduleSlots', weekStartDate.toISOString(), isMasterSchedule]
            });
            await refreshSlots();
            setForceRefreshKey(prev => prev + 1);
            setShouldRestoreScroll(true);
            // Don't close dialog here - let the form handle it after all slots are created
          },
          onError: (error) => {
            console.error('Error creating slot:', error);
            alert('Error creating slot. Please try again.');
            setIsSlotSaving(false);
          }
        });
      }
    } catch (error) {
      console.error('Error saving slot - detailed error:', error, error?.response?.data || error?.message || 'Unknown error');
      alert('An error occurred while saving the slot. Please try again.');
      setIsSlotSaving(false);
    }
  };

  // Wrap the edit slot handler to include isMasterSchedule
  const wrappedEditSlotHandler = (slot: ScheduleSlot, e: React.MouseEvent) => 
    handleEditSlot(slot, e, isMasterSchedule);


  // Handle creating new slots from drag-and-drop
  const handleCreateSlot = (dayIndex: number, time: string, duration: number = 1) => {
    if (!isMasterSchedule) return; // Only allow in master schedule
    
    console.log('Creating new slot from drag:', { dayIndex, time, duration });
    
    // Calculate end time based on duration
    const startTimeParts = time.split(':');
    const startHour = parseInt(startTimeParts[0]);
    const startMinute = parseInt(startTimeParts[1]);
    
    const endHour = startHour + duration;
    const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`;
    
    // Create a new slot object with the clicked day pre-selected
    const newSlot: Partial<ScheduleSlot> = {
      day_of_week: dayIndex,
      start_time: `${time}:00`,
      end_time: endTime,
      show_name: '',
      host_name: '',
      is_master: true,
      is_recurring: false,
      is_prerecorded: false,
      is_collection: false,
      has_lineup: false,
      color: 'green'
    };
    
    // Set the editing slot and show the dialog
    setEditingSlot(newSlot as ScheduleSlot);
    setShowSlotDialog(true);
  };

  const handleCloseDialog = () => {
    setShowSlotDialog(false);
    setIsEditing(false);
    
    // If we were in saving mode but dialog is closed, ensure scroll is restored
    if (isSlotSaving) {
      setShouldRestoreScroll(true);
    }
  };

  return (
    <div className="space-y-4" ref={containerRef} style={containerHeight ? { height: containerHeight } : undefined}>
      {/* Print Header - Only visible when printing */}
      <div className="print-schedule-header">
        <h1 className="text-2xl font-bold text-center mb-4">לוח שידורים</h1>
        <h2 className="text-xl text-center mb-6">{dateRangeDisplay}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading schedule...</div>
        </div>
      ) : (
        <>
          
          <ScheduleHeader 
            selectedDate={selectedDateState}
            setSelectedDate={setSelectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            handleAddSlot={handleAddSlot}
            isAdmin={isAdmin}
            showAddButton={showAddButton && isAuthenticated}
            hideDateControls={hideDateControls}
          />
          
          <ScheduleGrid
            key={`schedule-grid-${forceRefreshKey}`}
            scheduleSlots={displayedSlots}
            selectedDate={selectedDateState}
            viewMode={viewMode}
            handleSlotClick={handleSlotClick}
            handleEditSlot={wrappedEditSlotHandler}
            handleDeleteSlot={handleDeleteSlot}
            handleCreateSlot={handleCreateSlot}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
            hideHeaderDates={hideHeaderDates}
            dayNotes={dayNotes}
            bottomNotes={bottomNotes}
            onDayNoteChange={refreshDayNotes}
            deletingSlots={deletingSlots}
            onBottomNoteChange={refreshBottomNotes}
            isMasterSchedule={isMasterSchedule}
            isProducer={isProducer}
          />
          
          <ScheduleDialogs
            isAdmin={isAdmin}
            showSlotDialog={showSlotDialog}
            showEditModeDialog={showEditModeDialog && !isMasterSchedule}
            editingSlot={editingSlot}
            isMasterSchedule={isMasterSchedule}
            selectedDate={selectedDateState}
            onCloseSlotDialog={handleCloseDialog}
            onCloseEditModeDialog={() => setShowEditModeDialog(false)}
            onEditCurrent={handleEditCurrent}
            onEditAll={handleEditAll}
            onSaveSlot={handleSaveSlot}
          />
        </>
      )}
    </div>
  );
};

export default ScheduleView;
