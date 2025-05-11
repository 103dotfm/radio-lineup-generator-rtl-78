import { useState, useEffect, useCallback } from 'react';
import { ProducerAssignment } from '@/lib/supabase/producers';
import { ScheduleSlot } from '@/types/schedule';
import { useAssignmentSubmission } from './useAssignmentSubmission';
import { useScroll } from '@/contexts/ScrollContext';

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
    setProducerForms([{ workerId: '', role: '', additionalText: '' }]);
    setVisibleWorkerCount(1);
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

  const toggleDay = (day: number) => {
    setSelectedDays(prevDays => {
      if (prevDays.includes(day)) {
        return prevDays.filter(d => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const handleAssignProducer = (slot: ScheduleSlot, existingAssignments: ProducerAssignment[]) => {
    setIsScrollLocked(true);
    setIsDialogOpen(true);
    setCurrentSlot(slot);
    
    // Pre-fill the form with existing assignments
    if (existingAssignments && existingAssignments.length > 0) {
      const initialForms = existingAssignments.map(assignment => ({
        workerId: assignment.worker_id,
        role: assignment.role,
        additionalText: assignment.notes || ''
      }));
      setProducerForms(initialForms);
      setVisibleWorkerCount(initialForms.length);
    } else {
      setProducerForms([{ workerId: '', role: '', additionalText: '' }]);
      setVisibleWorkerCount(1);
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
