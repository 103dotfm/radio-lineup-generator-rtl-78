import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import { ScheduleSlot } from '@/types/schedule';

export function useScheduleHandlers(
  selectedDate: Date,
  setShowSlotDialog: (show: boolean) => void,
  setEditingSlot: (slot: ScheduleSlot | undefined) => void,
  setShowEditModeDialog: (show: boolean) => void,
  isAuthenticated: boolean,
  deleteSlot: (slot: ScheduleSlot) => Promise<void>
) {
  const navigate = useNavigate();

  const handleAddSlot = () => {
    setEditingSlot(undefined);
    setShowSlotDialog(true);
  };

  const handleDeleteSlot = async (slot: ScheduleSlot, e: React.MouseEvent) => {
    e.stopPropagation();

    // Skip confirmation if CTRL key is pressed
    if (e.ctrlKey) {
      await deleteSlot(slot);
      return;
    }
    
    if (window.confirm('האם אתה בטוח שברצונך למחוק משבצת שידור זו?')) {
      await deleteSlot(slot);
    }
  };

  const handleEditSlot = (slot: ScheduleSlot, e: React.MouseEvent, isMasterSchedule: boolean) => {
    e.stopPropagation();
    
    // Set the editingSlot in all cases
    setEditingSlot(slot);
    
    // For both master schedule and weekly schedule, directly show the edit dialog
    // Weekly schedule edits should always be single (affect only this specific cell)
    console.log('Editing slot - directly showing edit dialog');
    setShowSlotDialog(true);
  };

  const handleSlotClick = async (slot: ScheduleSlot) => {
    if (!isAuthenticated) return;
    console.log('Clicked slot details:', {
      show_name: slot.show_name,
      host_name: slot.host_name,
      start_time: slot.start_time,
      is_prerecorded: slot.is_prerecorded,
      is_collection: slot.is_collection,
      slot_id: slot.id,
      parent_slot_id: slot.parent_slot_id,
      is_master: slot.is_master
    });
    
    if (slot.shows && slot.shows.length > 0) {
      const show = slot.shows[0];
      console.log('Found existing show, navigating to:', show.id);
      navigate(`/show/${show.id}`);
    } else {
      // Calculate the slot date based on the week's start (Sunday)
      // slot.day_of_week is 0-6 (Sunday=0, Monday=1, etc.)
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const slotDate = addDays(weekStart, slot.day_of_week);
      
      // Debug: Let's verify the calculation
      console.log('Date calculation details:', {
        selectedDate: selectedDate.toISOString(),
        selectedDateDay: selectedDate.getDay(),
        weekStart: weekStart.toISOString(),
        slotDayOfWeek: slot.day_of_week,
        expectedDay: slot.day_of_week === 0 ? 'Sunday' : 
                    slot.day_of_week === 1 ? 'Monday' : 
                    slot.day_of_week === 2 ? 'Tuesday' : 
                    slot.day_of_week === 3 ? 'Wednesday' : 
                    slot.day_of_week === 4 ? 'Thursday' : 
                    slot.day_of_week === 5 ? 'Friday' : 'Saturday',
        calculatedSlotDate: slotDate.toISOString(),
        calculatedDay: slotDate.getDay() === 0 ? 'Sunday' : 
                      slotDate.getDay() === 1 ? 'Monday' : 
                      slotDate.getDay() === 2 ? 'Tuesday' : 
                      slotDate.getDay() === 3 ? 'Wednesday' : 
                      slotDate.getDay() === 4 ? 'Thursday' : 
                      slotDate.getDay() === 5 ? 'Friday' : 'Saturday'
      });
      
      console.log('Date calculation debug:', {
        selectedDate: selectedDate.toISOString(),
        selectedDateDay: selectedDate.getDay(),
        weekStart: weekStart.toISOString(),
        slotDayOfWeek: slot.day_of_week,
        calculatedSlotDate: slotDate.toISOString(),
        slotDateDay: slotDate.getDay()
      });
      
      const generatedShowName = slot.show_name === slot.host_name 
        ? slot.host_name 
        : `${slot.show_name} עם ${slot.host_name}`;
      
      // Check if this is a virtual slot (has parent_slot_id but might not exist in DB)
      let actualSlotId = slot.id;
      
      if (slot.parent_slot_id && slot.is_master === false) {
        console.log('Detected virtual slot - creating real weekly slot before lineup creation');
        
        try {
          // Create a real weekly slot for this virtual slot
          const slotData = {
            slot_date: format(slotDate, 'yyyy-MM-dd'),
            start_time: slot.start_time,
            end_time: slot.end_time,
            show_name: slot.show_name,
            host_name: slot.host_name,
            has_lineup: false,
            color: slot.color || 'green',
            is_prerecorded: slot.is_prerecorded || false,
            is_collection: slot.is_collection || false,
            is_master: false,
            day_of_week: slot.day_of_week,
            parent_slot_id: slot.parent_slot_id,
            is_recurring: slot.is_recurring || false,
            is_deleted: false,
            rds_pty: slot.rds_pty || 1,
            rds_ms: slot.rds_ms || 0,
            rds_radio_text: slot.rds_radio_text || '',
            rds_radio_text_translated: slot.rds_radio_text_translated || ''
          };
          
          console.log('Creating real weekly slot for virtual slot:', slotData);
          
          // Import the API function
          const { createScheduleSlot } = await import('@/lib/api/schedule');
          
          const createdSlot = await createScheduleSlot(slotData, false, selectedDate);
          actualSlotId = createdSlot.id;
          
          console.log('Successfully created real weekly slot with ID:', actualSlotId);
        } catch (error) {
          console.error('Error creating real weekly slot for virtual slot:', error);
          // Continue with the original slot ID - the lineup creation will handle the error
        }
      }
      
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
          slotId: actualSlotId
        }
      });
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

  return {
    handleAddSlot,
    handleDeleteSlot,
    handleEditSlot,
    handleSlotClick,
    handleEditCurrent,
    handleEditAll
  };
}
