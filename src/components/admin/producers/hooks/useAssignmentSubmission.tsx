
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
      
      for (const form of validForms) {
        const selectedRole = roles.find(r => r.id === form.role);
        const roleName = selectedRole ? selectedRole.name : '';
        
        // Format the week start consistently as YYYY-MM-DD
        const formattedWeekStart = format(currentWeek, 'yyyy-MM-dd');
        
        // Check if we're creating a permanent assignment
        if (isPermanent) {
          console.log(`Creating permanent assignment for worker ${form.workerId} with role ${roleName}`);
          try {
            const success = await createRecurringProducerAssignment(
              currentSlot.id,
              form.workerId,
              roleName,
              formattedWeekStart
            );
            
            if (success) {
              successCount++;
              
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
                worker: {
                  id: form.workerId,
                  name: assignments.find(a => a.worker_id === form.workerId)?.worker?.name || 'Unknown',
                  position: assignments.find(a => a.worker_id === form.workerId)?.worker?.position || null,
                  email: null
                },
                slot: currentSlot
              };
              
              newAssignments.push(newAssignment);
            }
          } catch (error: any) {
            console.error("Error creating permanent assignment:", error);
            toast({
              title: "שגיאה",
              description: error.message || "לא ניתן להוסיף את העובד לסידור הקבוע",
              variant: "destructive"
            });
          }
        } 
        // Check if we're creating assignments for multiple selected days
        else if (selectedDays.length > 0) {
          console.log(`Creating assignments for selected days: ${selectedDays.join(', ')} for worker ${form.workerId} with role ${roleName}`);
          
          // First create assignment for current slot if its day is selected
          if (selectedDays.includes(currentSlot.day_of_week)) {
            try {
              const currentSlotAssignment = {
                slot_id: currentSlot.id,
                worker_id: form.workerId,
                role: roleName,
                week_start: formattedWeekStart,
                is_recurring: false,
                notes: form.additionalText || undefined
              };
              
              console.log(`Creating producer assignment with week_start: ${formattedWeekStart}`);
              const result = await createProducerAssignment(currentSlotAssignment);
              if (result) {
                successCount++;
                newAssignments.push(result);
              }
            } catch (error: any) {
              console.error("Error creating assignment for current slot:", error);
            }
          }
          
          // Then find and create assignments for all other selected days
          // Extract critical information from current slot
          const currentTime = currentSlot.start_time;
          
          // Get applicable days from selected days (excluding the current day if already processed)
          const applicableDays = selectedDays.filter(day => day !== currentSlot.day_of_week);
          
          for (const dayIndex of applicableDays) {
            const key = `${dayIndex}-${currentTime}`;
            const slotsForDay = slotsByDayAndTime[key] || [];
            
            // Check if we have slots for this day and time
            if (slotsForDay.length > 0) {
              for (const slot of slotsForDay) {
                // Make sure slot exists and is valid
                if (!slot || !slot.id) continue;
                
                try {
                  const assignment = {
                    slot_id: slot.id,
                    worker_id: form.workerId,
                    role: roleName,
                    week_start: formattedWeekStart,
                    is_recurring: false,
                    notes: form.additionalText || undefined
                  };
                  
                  console.log(`Creating assignment for day ${dayIndex} slot for worker ${form.workerId}`);
                  console.log(`Creating producer assignment with week_start: ${formattedWeekStart}`);
                  const result = await createProducerAssignment(assignment);
                  if (result) {
                    successCount++;
                    newAssignments.push(result);
                  }
                } catch (error: any) {
                  console.error(`Error creating assignment for day ${dayIndex} slot:`, error);
                }
              }
            }
          }
        } else {
          // Create a single assignment
          try {
            const assignment = {
              slot_id: currentSlot.id,
              worker_id: form.workerId,
              role: roleName,
              week_start: formattedWeekStart,
              is_recurring: false,
              notes: form.additionalText || undefined
            };
            
            console.log(`Creating single assignment for worker ${form.workerId} with role ${roleName}`);
            const result = await createProducerAssignment(assignment);
            if (result) {
              successCount++;
              newAssignments.push(result);
            }
          } catch (error: any) {
            console.error("Error creating producer assignment:", error);
          }
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "נוסף בהצלחה",
          description: `נוספו ${successCount} שיבוצים לסידור העבודה`
        });
        
        // Close the dialog - don't reload data yet
        onClose();
        
        // Pass the new assignments to the parent
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

  return {
    handleSubmit,
    isSubmitting
  };
};
