
import { useState, useEffect, useCallback } from 'react';
import { ProducerAssignment, getProducerAssignments } from '@/lib/supabase/producers';
import { ScheduleSlot } from '@/types/schedule';
import { useAssignmentSubmission } from './useAssignmentSubmission';
import { useScroll } from '@/contexts/ScrollContext';
import { subWeeks, startOfWeek, format, addWeeks } from 'date-fns';
import { api } from '@/lib/api-client';

export interface ProducerFormItem {
  workerId: string;
  role: string;
  additionalText?: string;
}

interface UseAssignmentDialogProps {
  currentWeek: Date;
  roles: any[];
  slotsByDayAndTime: { [key: string]: ScheduleSlot[] };
  onSuccess: (newAssignments: ProducerAssignment[]) => void;
  assignments: ProducerAssignment[];
  producers: any[]; // Make sure this is included
}

export const useAssignmentDialog = ({
  currentWeek,
  roles,
  slotsByDayAndTime,
  onSuccess,
  assignments,
  producers // Make sure this is received properly
}: UseAssignmentDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<ScheduleSlot | null>(null);
  const [producerForms, setProducerForms] = useState<ProducerFormItem[]>([
    { workerId: '', role: '', additionalText: '' }
  ]);
  const [visibleWorkerCount, setVisibleWorkerCount] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isPermanent, setIsPermanent] = useState(false);
  const { setIsScrollLocked } = useScroll();

  // Reset the form state when dialog opens
  useEffect(() => {
    if (!isDialogOpen) {
      resetFormState();
    }
  }, [isDialogOpen]);

  const resetFormState = () => {
    // Set default roles: first "עריכה", second "הפקה"
    const editingRole = roles.find(r => r.name === 'עריכה');
    const productionRole = roles.find(r => r.name === 'הפקה');
    
    setProducerForms([
      { workerId: '', role: editingRole?.id || '', additionalText: '' },
      { workerId: '', role: productionRole?.id || '', additionalText: '' }
    ]);
    setVisibleWorkerCount(2);
    setSelectedDays([]);
    setIsPermanent(false);
    setCurrentSlot(null);
  };

  const updateProducerForm = (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => {
    setProducerForms(prevForms => {
      const newForms = [...prevForms];
      newForms[index] = { ...newForms[index], [field]: value };
      return newForms;
    });
  };

  const addWorkerForm = () => {
    setVisibleWorkerCount(prevCount => prevCount + 1);
    setProducerForms(prevForms => [...prevForms, { workerId: '', role: '', additionalText: '' }]);
  };

  const removeWorkerForm = (index: number) => {
    if (visibleWorkerCount > 1) {
      setVisibleWorkerCount(prevCount => prevCount - 1);
      setProducerForms(prevForms => {
        const newForms = [...prevForms];
        newForms.splice(index, 1);
        return newForms;
      });
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prevDays => {
      // Special case: -1 means clear all days
      if (day === -1) {
        return [];
      }
      
      if (prevDays.includes(day)) {
        return prevDays.filter(d => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const getLastWeekAssignments = async (slot: ScheduleSlot): Promise<ProducerAssignment[]> => {
    try {
      const lastWeek = startOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 0 });
      const lastWeekFormatted = format(lastWeek, 'yyyy-MM-dd');
      
      console.log('getLastWeekAssignments: Looking for slot:', {
        slotId: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        showName: slot.show_name,
        lastWeekFormatted,
        currentWeek: currentWeek,
        lastWeek: lastWeek
      });
      
      // Query assignments for last week - let's also try a broader range to find the assignment
      const { data: assignments, error } = await api.query('/producer-assignments', {
        where: { 
          week_start: lastWeekFormatted,
          is_deleted: false
        }
      });
      
      // If we don't find assignments for the exact week, try a broader range
      let allAssignments = assignments || [];
      if (allAssignments.length === 0) {
        console.log('getLastWeekAssignments: No assignments found for exact week, trying broader range');
        const weekBefore = format(subWeeks(lastWeek, 1), 'yyyy-MM-dd');
        const weekAfter = format(addWeeks(lastWeek, 1), 'yyyy-MM-dd');
        
        const { data: broaderAssignments, error: broaderError } = await api.query('/producer-assignments', {
          where: { 
            week_start: { gte: weekBefore, lte: weekAfter },
            is_deleted: false
          }
        });
        
        if (!broaderError && broaderAssignments) {
          allAssignments = broaderAssignments;
          console.log('getLastWeekAssignments: Found assignments in broader range:', allAssignments.length);
        }
      }
      
      if (error) {
        console.error('Error fetching last week assignments:', error);
        return [];
      }
      
      console.log('getLastWeekAssignments: Found assignments:', allAssignments?.length || 0);
      console.log('getLastWeekAssignments: All assignments:', allAssignments);
      
      // Log each assignment in detail
      (allAssignments || []).forEach((assignment, index) => {
        console.log(`getLastWeekAssignments: Assignment ${index}:`, {
          id: assignment.id,
          is_recurring: assignment.is_recurring,
          slot_id: assignment.slot_id,
          worker_id: assignment.worker_id,
          role: assignment.role,
          week_start: assignment.week_start,
          allKeys: Object.keys(assignment)
        });
      });
      
      // Query slots to get slot details for non-recurring assignments
      // First try master schedule slots
      let { data: slots, error: slotsError } = await api.query('/schedule/slots', {
        isMasterSchedule: true
      });
      
      // If we don't find the slot in master schedule, try the specific week
      if (!slotsError && slots) {
        const targetSlotId = 'a615c306-0650-4f7b-b856-d7ffbc7ba71e';
        const slotExists = slots.some(slot => slot.id === targetSlotId);
        
        if (!slotExists) {
          console.log('getLastWeekAssignments: Slot not found in master schedule, trying specific week');
          const { data: weekSlots, error: weekSlotsError } = await api.query('/schedule/slots', {
            selectedDate: lastWeekFormatted,
            isMasterSchedule: false
          });
          
          if (!weekSlotsError && weekSlots) {
            slots = weekSlots;
            console.log('getLastWeekAssignments: Found week-specific slots:', weekSlots.length);
          }
        }
      }
      
      if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        return [];
      }
      
      console.log('getLastWeekAssignments: Found slots:', slots?.length || 0);
      
      // Create a map of slots by ID
      const slotsMap = {};
      (slots || []).forEach(slotItem => {
        slotsMap[slotItem.id] = slotItem;
      });
      
      console.log('getLastWeekAssignments: Slots map created with', Object.keys(slotsMap).length, 'slots');
      console.log('getLastWeekAssignments: Looking for slot ID:', 'a615c306-0650-4f7b-b856-d7ffbc7ba71e');
      console.log('getLastWeekAssignments: Slot exists in map:', !!slotsMap['a615c306-0650-4f7b-b856-d7ffbc7ba71e']);
      
      // Log some sample slot IDs to see what we have
      const sampleSlotIds = Object.keys(slotsMap).slice(0, 5);
      console.log('getLastWeekAssignments: Sample slot IDs:', sampleSlotIds);
      
      // Check if any slots match our target slot characteristics
      const matchingSlots = Object.values(slotsMap).filter(slot => 
        slot.day_of_week === slot.day_of_week &&
        slot.start_time === slot.start_time &&
        slot.show_name === slot.show_name
      );
      console.log('getLastWeekAssignments: Slots matching target characteristics:', matchingSlots.length);
      
      // Find assignments that match the slot characteristics
      const matchingAssignments = (allAssignments || []).filter(assignment => {
        console.log('getLastWeekAssignments: Checking assignment:', {
          assignmentId: assignment.id,
          isRecurring: assignment.is_recurring,
          slotId: assignment.slot_id,
          workerId: assignment.worker_id,
          role: assignment.role
        });
        
        // For recurring assignments, match by day_of_week, start_time, and show_name
        if (assignment.is_recurring) {
          const matches = (assignment as any).day_of_week === slot.day_of_week &&
                         (assignment as any).start_time === slot.start_time &&
                         (assignment as any).show_name === slot.show_name;
          
          console.log('getLastWeekAssignments: Checking recurring assignment:', {
            assignmentDay: (assignment as any).day_of_week,
            assignmentTime: (assignment as any).start_time,
            assignmentShow: (assignment as any).show_name,
            targetDay: slot.day_of_week,
            targetTime: slot.start_time,
            targetShow: slot.show_name,
            matches
          });
          
          return matches;
        }
        // For non-recurring assignments, try to match by slot characteristics first
        // This handles cases where slot_id might not exist in current week's slots
        else {
          // First try to match by slot_id if the slot exists
          if (assignment.slot_id && slotsMap[assignment.slot_id]) {
            const slotDetails = slotsMap[assignment.slot_id];
            const slotMatches = slotDetails.day_of_week === slot.day_of_week &&
                               slotDetails.start_time === slot.start_time &&
                               slotDetails.show_name === slot.show_name;
            
            console.log('getLastWeekAssignments: Checking non-recurring assignment by slot_id:', {
              assignmentSlotId: assignment.slot_id,
              slotDetails: slotDetails,
              targetDay: slot.day_of_week,
              targetTime: slot.start_time,
              targetShow: slot.show_name,
              slotMatches
            });
            
            return slotMatches;
          }
          // If slot_id doesn't exist or slot not found, try to match by assignment characteristics
          // This handles cases where assignments were created for slots that no longer exist
          else if ((assignment as any).day_of_week !== undefined && 
                   (assignment as any).start_time !== undefined && 
                   (assignment as any).show_name !== undefined) {
            const matches = (assignment as any).day_of_week === slot.day_of_week &&
                           (assignment as any).start_time === slot.start_time &&
                           (assignment as any).show_name === slot.show_name;
            
            console.log('getLastWeekAssignments: Checking non-recurring assignment by characteristics:', {
              assignmentDay: (assignment as any).day_of_week,
              assignmentTime: (assignment as any).start_time,
              assignmentShow: (assignment as any).show_name,
              targetDay: slot.day_of_week,
              targetTime: slot.start_time,
              targetShow: slot.show_name,
              matches
            });
            
            return matches;
          }
          else {
            console.log('getLastWeekAssignments: Assignment has no slot_id or slot not found:', {
              assignmentId: assignment.id,
              slotId: assignment.slot_id,
              slotExists: assignment.slot_id ? !!slotsMap[assignment.slot_id] : false
            });
          }
        }
        
        return false;
      });
      
      console.log('getLastWeekAssignments: Matching assignments found:', matchingAssignments.length);
      return matchingAssignments;
    } catch (error) {
      console.error('Error fetching last week assignments:', error);
      return [];
    }
  };

  const handleAssignProducer = async (slot: ScheduleSlot, existingAssignments: ProducerAssignment[]) => {
    setIsScrollLocked(true);
    setIsDialogOpen(true);
    setCurrentSlot(slot);
    
    // Pre-fill the form with existing assignments
    if (existingAssignments && existingAssignments.length > 0) {
      const initialForms = existingAssignments.map(assignment => {
        // Find the corresponding role ID based on the role name
        const roleObject = roles.find(r => r.name === assignment.role);
        const roleId = roleObject ? roleObject.id : '';
        
        return {
          workerId: assignment.worker_id,
          role: roleId, // Use the mapped role ID instead of the role name
          additionalText: assignment.notes || ''
        };
      });
      
      setProducerForms(initialForms);
      setVisibleWorkerCount(initialForms.length);
      
      // Check if any of the existing assignments are recurring and set isPermanent accordingly
      const hasRecurringAssignment = existingAssignments.some(assignment => assignment.is_recurring);
      setIsPermanent(hasRecurringAssignment);
    } else {
      // No existing assignments - try to get last week's assignments as default
      const lastWeekAssignments = await getLastWeekAssignments(slot);
      
      if (lastWeekAssignments.length > 0) {
        // Use last week's assignments as default
        const initialForms = lastWeekAssignments.map(assignment => {
          const roleObject = roles.find(r => r.name === assignment.role);
          const roleId = roleObject ? roleObject.id : '';
          
          return {
            workerId: assignment.worker_id,
            role: roleId,
            additionalText: assignment.notes || ''
          };
        });
        
        setProducerForms(initialForms);
        setVisibleWorkerCount(initialForms.length);
        setIsPermanent(false); // Don't make it permanent by default
      } else {
        // Set default roles: first "עריכה", second "הפקה"
        const editingRole = roles.find(r => r.name === 'עריכה');
        const productionRole = roles.find(r => r.name === 'הפקה');
        
        setProducerForms([
          { workerId: '', role: editingRole?.id || '', additionalText: '' },
          { workerId: '', role: productionRole?.id || '', additionalText: '' }
        ]);
        setVisibleWorkerCount(2);
        setIsPermanent(false);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsScrollLocked(false);
  };

  // Process the form when assignment dialog is confirmed
  const { handleSubmit, isSubmitting } = useAssignmentSubmission({
    currentWeek,
    roles,
    slotsByDayAndTime,
    onSuccess,
    assignments,
    currentSlot,
    producerForms,
    visibleWorkerCount,
    selectedDays,
    isPermanent,
    onClose: () => setIsDialogOpen(false),
    producers // Make sure to pass this down
  });

  return {
    isDialogOpen,
    setIsDialogOpen,
    currentSlot,
    producerForms,
    updateProducerForm,
    visibleWorkerCount,
    addWorkerForm,
    removeWorkerForm,
    selectedDays,
    toggleDay,
    isPermanent,
    setIsPermanent,
    handleAssignProducer,
    handleSubmit,
    handleCloseDialog,
    isSubmitting
  };
};
