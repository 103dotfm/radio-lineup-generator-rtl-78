
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
      // Use full ISO string format to match database expectations
      const formattedWeekStart = currentWeek.toISOString();
      
      // Process each valid form entry
      for (const form of validForms) {
        const selectedRole = roles.find(r => r.id === form.role);
        const roleName = selectedRole ? selectedRole.name : '';
        
        // Get the worker details for adding to UI immediately
        const workerDetails = producers.find(p => p.id === form.workerId) || 
          { id: form.workerId, name: 'עובד לא ידוע', position: null, email: null };
        
        // Handle permanent assignments (recurring)
        if (isPermanent) {
          try {
            // For permanent assignments, we need to create recurring assignments for all selected days
            // If no days are selected, use the current slot's day
            const daysToProcess = selectedDays.length > 0 ? selectedDays : [currentSlot.day_of_week];
            
            for (const dayIndex of daysToProcess) {
              const currentTime = currentSlot.start_time;
              const key = `${dayIndex}-${currentTime}`;
              const slotsForDay = slotsByDayAndTime[key] || [];
              
              // If no slots found for this day/time, skip
              if (slotsForDay.length === 0) {
                continue;
              }
              
              // Create recurring assignment for each slot on this day
              for (const slot of slotsForDay) {
                if (!slot || !slot.id) continue;
                
                // For recurring assignments, use the slot's week start date, not the currently viewed week
                // This ensures the assignment starts from the week it was created, not from a past week
                const slotWeekStart = new Date(currentWeek);
                // Adjust to the slot's day of week
                const currentDayOfWeek = slotWeekStart.getDay(); // 0 = Sunday
                const targetDayOfWeek = dayIndex; // 0 = Sunday
                const daysDiff = targetDayOfWeek - currentDayOfWeek;
                slotWeekStart.setDate(slotWeekStart.getDate() + daysDiff);
                
                // Format as YYYY-MM-DD for consistent storage
                const slotWeekStartFormatted = slotWeekStart.toISOString().split('T')[0];
                
                const success = await createRecurringProducerAssignment(
                  slot.id,
                  form.workerId,
                  roleName,
                  slotWeekStartFormatted, // Use the slot's week start date
                  slot.day_of_week,
                  slot.start_time,
                  slot.show_name
                );
                
                if (success) {
                  // Create a placeholder assignment to update the UI
                  const newAssignment: ProducerAssignment = {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    slot_id: slot.id,
                    worker_id: form.workerId,
                    role: roleName,
                    week_start: slotWeekStartFormatted,
                    is_recurring: true,
                    notes: form.additionalText || null,
                    created_at: new Date().toISOString(),
                    worker: workerDetails,
                    slot: slot
                  };
                  
                  newAssignments.push(newAssignment);
                  successCount++;
                }
              }
            }
          } catch (error) {
            console.error("Error creating permanent assignment:", error);
          }
        } 
        // Handle multi-day assignments (non-recurring)
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
        notes: notes || undefined,
        // Include slot characteristics for robust matching
        day_of_week: slotDetails?.day_of_week,
        start_time: slotDetails?.start_time,
        show_name: slotDetails?.show_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      

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
