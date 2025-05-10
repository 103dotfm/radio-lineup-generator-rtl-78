
import { useState, useCallback } from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { 
  createProducerAssignment,
  createRecurringProducerAssignment,
  ProducerAssignment
} from '@/lib/supabase/producers';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useScroll } from '@/contexts/ScrollContext';
import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID,
  EDITING_FIRST_ROLE_ID,
  EVENING_PRODUCTION_ROLE_ID
} from '../components/AssignmentDialog';

interface ProducerFormItem {
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
  
  // Only show 2 producers by default, with option to add more
  const [producerForms, setProducerForms] = useState<ProducerFormItem[]>([
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, // Default to עריכה
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, // Default to הפקה
    { workerId: '', role: EDITING_FIRST_ROLE_ID, additionalText: '' }, // Default to עריכה ראשית
    { workerId: '', role: EVENING_PRODUCTION_ROLE_ID, additionalText: '' }, // Default to הפקת ערב
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, 
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, 
  ]);
  
  // Track how many worker forms are visible (initially 2)
  const [visibleWorkerCount, setVisibleWorkerCount] = useState(2);
  
  // Selected weekdays for assignment (Sunday-0, Monday-1, Tuesday-2, Wednesday-3)
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isPermanent, setIsPermanent] = useState(false);
  
  const { toast } = useToast();
  const { saveScrollPosition, setIsScrollLocked } = useScroll();

  // Add another worker form field (show more)
  const addWorkerForm = () => {
    if (visibleWorkerCount < 4) {
      setVisibleWorkerCount(prev => prev + 1);
    }
  };

  const updateProducerForm = (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => {
    setProducerForms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Handle day selection properly
  const toggleDay = (dayId: number) => {
    if (dayId === -1) {
      // Special case to clear all days
      setSelectedDays([]);
      return;
    }

    setSelectedDays(current => 
      current.includes(dayId) 
        ? current.filter(id => id !== dayId) 
        : [...current, dayId]
    );
  };

  const handleAssignProducer = useCallback((slot: ScheduleSlot, slotAssignments: ProducerAssignment[]) => {
    // Lock scrolling during dialog operations
    setIsScrollLocked(true);
    
    // Save scroll position
    saveScrollPosition();
    setCurrentSlot(slot);
    
    // Reset form when opening dialog - showing only 2 workers initially
    const newProducerForms = [
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, // Default to עריכה
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, // Default to הפקה
      { workerId: '', role: EDITING_FIRST_ROLE_ID, additionalText: '' }, // Default to עריכה ראשית
      { workerId: '', role: EVENING_PRODUCTION_ROLE_ID, additionalText: '' }, // Default to הפקת ערב
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, 
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, 
    ];
    
    // Pre-populate the form with existing assignments
    if (slotAssignments.length > 0) {
      slotAssignments.forEach((assignment, index) => {
        // Only pre-populate up to 4 assignments
        if (index < 4) {
          const roleId = roles.find(r => r.name === assignment.role)?.id || EDITING_ROLE_ID;
          newProducerForms[index] = {
            workerId: assignment.worker_id,
            role: roleId,
            additionalText: assignment.notes || ''
          };
        }
      });
      
      // Set visible workers count to at least include all existing assignments 
      // (up to maximum of 4)
      setVisibleWorkerCount(Math.max(2, Math.min(4, slotAssignments.length)));
    } else {
      setVisibleWorkerCount(2); // Start with 2 visible if no existing assignments
    }
    
    setProducerForms(newProducerForms);
    setSelectedDays([]);
    setIsPermanent(false);
    
    setIsDialogOpen(true);
    
    // Unlock scrolling after dialog opens
    setIsScrollLocked(false);
  }, [roles, saveScrollPosition, setIsScrollLocked]);

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
        setIsDialogOpen(false);
        
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
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

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
    handleCloseDialog
  };
};
