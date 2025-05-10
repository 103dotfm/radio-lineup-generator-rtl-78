
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { 
  createProducerAssignment,
  createRecurringProducerAssignment,
  ProducerAssignment
} from '@/lib/supabase/producers';
import { ScheduleSlot } from '@/types/schedule';
import { useScroll } from '@/contexts/ScrollContext';
import { ProducerFormItem } from './useProducerForms';

interface UseAssignmentSubmissionProps {
  currentWeek: Date;
  roles: any[];
  slotsByDayAndTime: { [key: string]: ScheduleSlot[] };
  onSuccess: (newAssignments: ProducerAssignment[]) => void;
  assignments: ProducerAssignment[];
  currentSlot: ScheduleSlot | null;
  producerForms: ProducerFormItem[];
  visibleWorkerCount: number;
  selectedDays: number[];
  isPermanent: boolean;
  onClose: () => void;
}

export const useAssignmentSubmission = ({
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
  onClose
}: UseAssignmentSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { saveScrollPosition, setIsScrollLocked } = useScroll();

  const handleSubmit = async () => {
    if (!currentSlot) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה תוכנית",
        variant: "destructive"
      });
      return;
    }
    
    // Lock scrolling during submission
    setIsScrollLocked(true);
    setIsSubmitting(true);
    
    // Store current scroll position
    saveScrollPosition();
    
    // Only use visible worker forms, then filter out empty rows
    const visibleForms = producerForms.slice(0, visibleWorkerCount);
    const validForms = visibleForms.filter(form => form.workerId && form.role);
    
    if (validForms.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות מפיק אחד",
        variant: "destructive"
      });
      setIsScrollLocked(false);
      setIsSubmitting(false);
      return;
    }
    
    try {
      let successCount = 0;
      const newAssignments: ProducerAssignment[] = [];
      
      // Process each valid form entry
      for (const form of validForms) {
        const selectedRole = roles.find(r => r.id === form.role);
        const roleName = selectedRole ? selectedRole.name : '';
        const formattedWeekStart = format(currentWeek, 'yyyy-MM-dd');
        
        // Handle permanent assignments
        if (isPermanent) {
          await handlePermanentAssignment(form, roleName, formattedWeekStart, newAssignments, successCount);
        } 
        // Handle multi-day assignments
        else if (selectedDays.length > 0) {
          await handleMultiDayAssignment(form, roleName, formattedWeekStart, selectedDays, newAssignments, successCount);
        } 
        // Handle single assignment
        else {
          await handleSingleAssignment(form, roleName, formattedWeekStart, newAssignments, successCount);
        }
      }
      
      // Show appropriate toast and update UI
      if (newAssignments.length > 0) {
        toast({
          title: "נוסף בהצלחה",
          description: `נוספו ${newAssignments.length} שיבוצים לסידור העבודה`
        });
        
        // Close the dialog
        onClose();
        
        // Pass the new assignments to the parent for local state update
        onSuccess(newAssignments);
      } else {
        toast({
          title: "מידע",
          description: "לא נוספו שיבוצים חדשים. ייתכן שהם כבר קיימים במערכת."
        });
      }
    } catch (error: any) {
      console.error("Error assigning producers:", error);
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בהוספת העובדים לסידור",
        variant: "destructive"
      });
    } finally {
      // Unlock scrolling after submission
      setIsScrollLocked(false);
      setIsSubmitting(false);
    }
  };

  // Helper function for permanent assignments
  const handlePermanentAssignment = async (
    form: ProducerFormItem, 
    roleName: string, 
    weekStart: string,
    newAssignments: ProducerAssignment[],
    successCount: number
  ) => {
    try {
      console.log(`Creating permanent assignment for worker ${form.workerId} with role ${roleName}`);
      const success = await createRecurringProducerAssignment(
        currentSlot!.id,
        form.workerId,
        roleName,
        weekStart
      );
      
      if (success) {
        // Create a placeholder assignment to update the UI
        const worker = assignments.find(a => a.worker_id === form.workerId)?.worker;
        
        const newAssignment: ProducerAssignment = {
          id: `temp-${Date.now()}-${Math.random()}`,
          slot_id: currentSlot!.id,
          worker_id: form.workerId,
          role: roleName,
          week_start: weekStart,
          is_recurring: true,
          notes: form.additionalText || null,
          created_at: new Date().toISOString(),
          worker: {
            id: form.workerId,
            name: worker?.name || 'Unknown',
            position: worker?.position || null,
            email: null
          },
          slot: currentSlot!
        };
        
        newAssignments.push(newAssignment);
        return successCount + 1;
      }
    } catch (error: any) {
      console.error("Error creating permanent assignment:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן להוסיף את העובד לסידור הקבוע",
        variant: "destructive"
      });
    }
    return successCount;
  };

  // Helper function for multi-day assignments
  const handleMultiDayAssignment = async (
    form: ProducerFormItem,
    roleName: string,
    weekStart: string,
    selectedDays: number[],
    newAssignments: ProducerAssignment[],
    successCount: number
  ) => {
    let updatedSuccessCount = successCount;
    
    // First create assignment for current slot if its day is selected
    if (selectedDays.includes(currentSlot!.day_of_week)) {
      const result = await createSingleAssignment(
        currentSlot!.id,
        form.workerId,
        roleName,
        weekStart,
        form.additionalText
      );
      
      if (result) {
        newAssignments.push(result);
        updatedSuccessCount++;
      }
    }
    
    // Process other selected days
    const currentTime = currentSlot!.start_time;
    const applicableDays = selectedDays.filter(day => day !== currentSlot!.day_of_week);
    
    for (const dayIndex of applicableDays) {
      const key = `${dayIndex}-${currentTime}`;
      const slotsForDay = slotsByDayAndTime[key] || [];
      
      for (const slot of slotsForDay) {
        if (!slot || !slot.id) continue;
        
        const result = await createSingleAssignment(
          slot.id,
          form.workerId,
          roleName,
          weekStart,
          form.additionalText
        );
        
        if (result) {
          newAssignments.push(result);
          updatedSuccessCount++;
        }
      }
    }
    
    return updatedSuccessCount;
  };

  // Helper function for single assignments
  const handleSingleAssignment = async (
    form: ProducerFormItem,
    roleName: string,
    weekStart: string,
    newAssignments: ProducerAssignment[],
    successCount: number
  ) => {
    const result = await createSingleAssignment(
      currentSlot!.id,
      form.workerId,
      roleName,
      weekStart,
      form.additionalText
    );
    
    if (result) {
      newAssignments.push(result);
      return successCount + 1;
    }
    return successCount;
  };

  // Common function to create a single assignment
  const createSingleAssignment = async (
    slotId: string,
    workerId: string,
    roleName: string,
    weekStart: string,
    notes?: string
  ) => {
    try {
      const assignment = {
        slot_id: slotId,
        worker_id: workerId,
        role: roleName,
        week_start: weekStart,
        is_recurring: false,
        notes: notes || undefined
      };
      
      console.log(`Creating single assignment for worker ${workerId} with role ${roleName}`);
      const result = await createProducerAssignment(assignment);
      return result;
    } catch (error: any) {
      console.error("Error creating producer assignment:", error);
      return null;
    }
  };

  return {
    handleSubmit,
    isSubmitting
  };
};
