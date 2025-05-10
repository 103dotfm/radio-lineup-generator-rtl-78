
import { useState, useCallback } from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { ProducerAssignment } from '@/lib/supabase/producers';
import { useScroll } from '@/contexts/ScrollContext';
import { useProducerForms } from './useProducerForms';
import { useDaySelection } from './useDaySelection';
import { useAssignmentSubmission } from './useAssignmentSubmission';

interface UseAssignmentDialogProps {
  currentWeek: Date;
  roles: any[];
  slotsByDayAndTime: { [key: string]: ScheduleSlot[] };
  onSuccess: (newAssignments: ProducerAssignment[]) => void;
  assignments: ProducerAssignment[];
}

export const useAssignmentDialog = ({
  currentWeek,
  roles,
  slotsByDayAndTime,
  onSuccess,
  assignments
}: UseAssignmentDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<ScheduleSlot | null>(null);
  
  const { 
    producerForms, 
    visibleWorkerCount, 
    updateProducerForm, 
    addWorkerForm,
    resetForms 
  } = useProducerForms(roles);
  
  const {
    selectedDays,
    isPermanent,
    setIsPermanent,
    toggleDay,
    resetDaySelection
  } = useDaySelection();
  
  const { saveScrollPosition, setIsScrollLocked } = useScroll();

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

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
    onClose: handleCloseDialog
  });

  const handleAssignProducer = useCallback((slot: ScheduleSlot, slotAssignments: ProducerAssignment[]) => {
    // Lock scrolling during dialog operations
    setIsScrollLocked(true);
    
    // Save scroll position
    saveScrollPosition();
    setCurrentSlot(slot);
    
    // Reset form data
    resetForms(slotAssignments);
    resetDaySelection();
    
    setIsDialogOpen(true);
    
    // Unlock scrolling after dialog opens
    setIsScrollLocked(false);
  }, [roles, saveScrollPosition, setIsScrollLocked, resetForms, resetDaySelection]);

  return {
    isDialogOpen,
    setIsDialogOpen,
    currentSlot,
    producerForms,
    updateProducerForm,
    visibleWorkerCount,
    addWorkerForm,
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
