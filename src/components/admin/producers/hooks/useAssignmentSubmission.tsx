
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
  producers: any[]; // Added producers property to fix the TypeScript error
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
  onClose,
  producers // Make sure to receive producers here
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
      
      // Format the week start date once for consistent use throughout the function
      const formattedWeekStart = format(currentWeek, 'yyyy-MM-dd');
      console.log("Submitting assignments for week starting:", formattedWeekStart);
      console.log("Is permanent assignment:", isPermanent);
      
      // Process each valid form entry
      for (const form of validForms) {
        const selectedRole = roles.find(r => r.id === form.role);
        const roleName = selectedRole ? selectedRole.name : '';
        
        // Get the worker details for adding to UI immediately
        const workerDetails = producers.find(p => p.id === form.workerId) || 
          { id: form.workerId, name: 'עובד לא ידוע', position: null, email: null };
        
        // Handle permanent assignments
        if (isPermanent) {
          try {
            console.log(`Creating permanent assignment for worker ${form.workerId} with role ${roleName} starting from ${formattedWeekStart}`);
            
            // Pass the current week's start date to ensure the recurring assignment
            // only applies from this week forward
            const success = await createRecurringProducerAssignment(
              currentSlot.id,
              form.workerId,
              roleName,
              formattedWeekStart // Pass the current week start date
            );
            
            if (success) {
              // Create a placeholder assignment to update the UI
              const newAssignment: ProducerAssignment = {
                id: `temp-${Date.now()}-${Math.random()}`,
                slot_id: currentSlot.id,
                worker_id: form.workerId,
                role: roleName,
                week_start: formattedWeekStart,
                is_recurring: true,
                notes: form.additionalText || null,
                created_at: new Date().toISOString(),
                worker: workerDetails,
                slot: currentSlot
              };
              
              newAssignments.push(newAssignment);
              successCount++;
            }
          } catch (error) {
            console.error("Error creating permanent assignment:", error);
          }
        } 
        // Handle multi-day assignments
        else if (selectedDays.length > 0) {
          // Handle current slot if its day is selected
          if (selectedDays.includes(currentSlot.day_of_week)) {
            const result = await createSingleAssignment(
              currentSlot.id,
              form.workerId,
              roleName,
              formattedWeekStart,
              form.additionalText,
              workerDetails,
              currentSlot
            );
            
            if (result) {
              newAssignments.push(result);
              successCount++;
            }
          }
          
          // Process other selected days
          const currentTime = currentSlot.start_time;
          const applicableDays = selectedDays.filter(day => day !== currentSlot.day_of_week);
          
          for (const dayIndex of applicableDays) {
            const key = `${dayIndex}-${currentTime}`;
            const slotsForDay = slotsByDayAndTime[key] || [];
            
            for (const slot of slotsForDay) {
              if (!slot || !slot.id) continue;
              
              const result = await createSingleAssignment(
                slot.id,
                form.workerId,
                roleName,
                formattedWeekStart,
                form.additionalText,
                workerDetails,
                slot
              );
              
              if (result) {
                newAssignments.push(result);
                successCount++;
              }
            }
          }
        } 
        // Handle single assignment
        else {
          const result = await createSingleAssignment(
            currentSlot.id,
            form.workerId,
            roleName,
            formattedWeekStart,
            form.additionalText,
            workerDetails,
            currentSlot
          );
          
          if (result) {
            newAssignments.push(result);
            successCount++;
          }
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

  // Common function to create a single assignment
  const createSingleAssignment = async (
    slotId: string,
    workerId: string,
    roleName: string,
    weekStart: string,
    notes?: string,
    workerDetails?: any,
    slotDetails?: ScheduleSlot
  ): Promise<ProducerAssignment | null> => {
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
      
      // If we have worker details, enhance the result for UI display
      if (result && workerDetails && slotDetails) {
        // Cast the result to ProducerAssignment to allow property assignment
        const enhancedResult = result as ProducerAssignment;
        enhancedResult.worker = workerDetails;
        enhancedResult.slot = slotDetails;
        return enhancedResult;
      }
      
      return result as ProducerAssignment;
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
