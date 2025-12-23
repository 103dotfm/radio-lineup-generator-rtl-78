import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { 
  deleteProducerAssignment,
  getProducerAssignments,
  getProducerRoles,
  getProducersByDivision,
  type ProducerAssignment
} from '@/lib/supabase/producers';
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';
import { ScheduleSlot } from '@/types/schedule';
import AssignmentDialog from './components/AssignmentDialog';
import SlotAssignments from './components/SlotAssignments';
import { useAssignmentDialog } from './hooks/useAssignmentDialog';
import { useScroll } from '@/contexts/ScrollContext';
import { api } from '@/lib/api-client';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
  onAssignmentChange?: () => void;
  refreshTrigger?: number;
  initialProducers?: any[];
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ 
  currentWeek, 
  onAssignmentChange,
  refreshTrigger = 0,
  initialProducers
}) => {
  // Important: use false for isMasterSchedule to get the weekly schedule instead of master
  const { slots: scheduleSlots, loading: slotsLoading } = useScheduleSlots(currentWeek, false);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { saveScrollPosition, restoreScrollPosition, setIsScrollLocked } = useScroll();
  const [producerDivisionId, setProducerDivisionId] = useState<string | undefined>(undefined);
  
  // Get the producer division ID from cache
  useEffect(() => {
    const cachedId = localStorage.getItem('producer-division-id');
    if (cachedId) {
      setProducerDivisionId(cachedId);
    }
  }, []);

  const { toast } = useToast();
  
  // Group slots by day and time for a more organized display and to support the multi-day assignment feature
  const slotsByDayAndTime: { [key: string]: ScheduleSlot[] } = {};
  
  // Create a map of unique slots to prevent duplicates
  const uniqueSlotsMap: { [key: string]: boolean } = {};
  
  // Add null check to prevent forEach error when scheduleSlots is undefined
  if (scheduleSlots && Array.isArray(scheduleSlots)) {
    scheduleSlots.forEach(slot => {
      const day = slot.day_of_week;
      const time = slot.start_time;
      const key = `${day}-${time}`;
      const uniqueKey = `${day}-${time}-${slot.show_name}-${slot.host_name}`;
      
      // Only process this slot if we haven't seen a duplicate already
      if (!uniqueSlotsMap[uniqueKey]) {
        uniqueSlotsMap[uniqueKey] = true;
        
        if (!slotsByDayAndTime[key]) {
          slotsByDayAndTime[key] = [];
        }
        slotsByDayAndTime[key].push(slot);
      }
    });
  }
  
  useEffect(() => {
    saveScrollPosition();
    loadData();
  }, [currentWeek, refreshTrigger, producerDivisionId]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use a consistent date format for the week start
      const weekStartDate = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const formattedDate = format(weekStartDate, 'yyyy-MM-dd');
      
      // Get assignments using the proper function that handles recurring assignments and skips
      const assignmentsData = await getProducerAssignments(weekStartDate);
      setAssignments(assignmentsData);
      
      // Get roles using local API - get them sorted by display_order
      const rolesResponse = await api.query('/producer-roles', {
        order: { display_order: 'asc' }
      });
      const rolesData = rolesResponse.data || [];
      setRoles(rolesData);
      
      // Use producers from props if available, otherwise fetch from API
      if (initialProducers && initialProducers.length > 0) {
        setProducers(initialProducers);
      } else {
        // Fetch producers filtered by department
        const producersResponse = await api.query('/workers', {
          where: { 
            or: [
              { 'department ILIKE': '%מפיקים%' },
              { 'department ILIKE': '%מפיק%' },
              { 'department ILIKE': '%הפקה%' },
              { 'department ILIKE': '%producers%' },
              { 'department ILIKE': '%Production staff%' }
            ]
          }
        });
        const producersData = producersResponse.data || [];
        setProducers(producersData);
        
        if (!producersData.length) {
          toast({
            title: "שים לב",
            description: "לא נמצאו מפיקים במערכת. ייתכן שיש בעיה בהגדרות המחלקה",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני הסידור",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      
      // Restore scroll position after a short delay to ensure the content is rendered
      setTimeout(() => {
        restoreScrollPosition();
      }, 50);
    }
  };
  
  // Helper function to match recurring assignments to slots
  const matchRecurringAssignmentToSlot = useCallback((assignment: ProducerAssignment, targetSlot: ScheduleSlot): boolean => {
    // For recurring assignments, we need to determine if they should apply to this slot
    // Since we don't have the original slot details, we'll use a more targeted approach
    
    // Check if this is a Friday slot (day_of_week === 5)
    if (targetSlot.day_of_week === 5) {
      // For Friday slots, we need to match based on the time and show characteristics
      // Let's check if this assignment is for a Friday slot by looking at the time
      
      // For 6AM Friday slot
      if (targetSlot.start_time === '06:00:00' && targetSlot.show_name === 'למבוגרים בלבד') {
        // Check if this assignment is for the 6AM Friday slot
        // We can identify this by checking if the assignment has the right role and worker
        return assignment.role === 'עריכה' || assignment.role === 'הפקה';
      }
      
      // For 7AM Friday slot
      if (targetSlot.start_time === '07:00:00' && targetSlot.show_name === 'התוכנית החברתית') {
        // Check if this assignment is for the 7AM Friday slot
        return assignment.role === 'עריכה' || assignment.role === 'הפקה';
      }
    }
    
    return false;
  }, []);

  // Get assignments for a slot
  const getAssignmentsForSlot = useCallback((slotId: string): ProducerAssignment[] => {
    // First, find the slot details to get day, time, and show name
    const slot = scheduleSlots?.find(s => s.id === slotId);
    
    if (!slot) {
      console.log(`getAssignmentsForSlot: Slot ${slotId} not found in scheduleSlots`);
      return [];
    }
    
    // Match assignments by slot_id first (for weekly assignments)
    const directMatches = assignments.filter((assignment) => assignment.slot_id === slotId);
    
    // For recurring assignments, match by day_of_week, start_time, and show_name
    const recurringMatches = assignments.filter((assignment) => {
      if (!assignment.is_recurring) return false;
      return (
        (assignment as any).day_of_week === slot.day_of_week &&
        (assignment as any).start_time === slot.start_time &&
        (assignment as any).show_name === slot.show_name
      );
    });
    
    // For weekly assignments, also match by slot characteristics if slot_id doesn't match
    // This handles cases where assignments were created for different slot IDs but same show
    const characteristicMatches = assignments.filter((assignment) => {
      if (assignment.is_recurring) return false; // Skip recurring assignments (already handled above)
      
      // Check if this assignment matches the slot characteristics
      const matchesCharacteristics = (
        (assignment as any).day_of_week === slot.day_of_week &&
        (assignment as any).start_time === slot.start_time &&
        (assignment as any).show_name === slot.show_name
      );
      
      // Only include if it matches characteristics and wasn't already found by slot_id
      return matchesCharacteristics && !directMatches.some(direct => direct.id === assignment.id);
    });
    
    // Combine all types of matches, avoiding duplicates
    const allMatches = [...directMatches];
    recurringMatches.forEach(recurringMatch => {
      if (!allMatches.some(match => match.id === recurringMatch.id)) {
        allMatches.push(recurringMatch);
      }
    });
    characteristicMatches.forEach(charMatch => {
      if (!allMatches.some(match => match.id === charMatch.id)) {
        allMatches.push(charMatch);
      }
    });
    
    return allMatches;
  }, [assignments, scheduleSlots]);
  
  const handleDeleteAssignment = async (assignmentId: string, deleteMode: 'current' | 'future' = 'current') => {
    saveScrollPosition();
    setIsScrollLocked(true);
    
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      
      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Format the current week's date consistently
      const weekStartDate = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const formattedWeekStart = format(weekStartDate, 'yyyy-MM-dd');
      
      const result = await deleteProducerAssignment(assignmentId, deleteMode, formattedWeekStart);
      
      if (result && result.success) {
        toast({
          title: "נמחק בהצלחה",
          description: result.message || (deleteMode === 'future' 
            ? "השיבוץ נמחק מכל השבועות העתידיים" 
            : "השיבוץ נמחק משבוע זה בלבד")
        });
        
        // Update local state instead of reloading everything
        if (deleteMode === 'current') {
          setAssignments(prevAssignments => 
            prevAssignments.filter(assignment => assignment.id !== assignmentId)
          );
        } else {
          // For 'future' mode, we need to reload the data as multiple assignments might be affected
          loadData();
        }
        
        if (onAssignmentChange) {
          onAssignmentChange(); // Notify parent component
        }
      } else {
        throw new Error("Failed to delete assignment");
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת השיבוץ",
        variant: "destructive"
      });
    } finally {
      setIsScrollLocked(false);
    }
  };
  
  // Handle new assignments by updating local state instead of reloading all data
  const handleNewAssignments = useCallback((newAssignments: ProducerAssignment[]) => {
    if (newAssignments.length === 0) return;
    
    // Check if any of the new assignments are recurring (permanent)
    const hasRecurringAssignments = newAssignments.some(assignment => assignment.is_recurring);
    
    if (hasRecurringAssignments) {
      // For recurring assignments, reload the data from the database to get the actual assignments
      loadData();
    } else {
      setAssignments(prevAssignments => {
        // Filter out any existing assignments that might be duplicates
        const filteredPrevAssignments = prevAssignments.filter(existing => 
          !newAssignments.some(newAssign => 
            newAssign.slot_id === existing.slot_id && 
            newAssign.worker_id === existing.worker_id && 
            newAssign.role === existing.role
          )
        );
        
        // Combine with the new assignments
        return [...filteredPrevAssignments, ...newAssignments];
      });
    }
    
    // Notify parent without triggering a full data reload
    if (onAssignmentChange) {
      onAssignmentChange();
    }
  }, [onAssignmentChange, loadData]);
  
  // Use the custom hook for dialog management and assignment operations
  const {
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
  } = useAssignmentDialog({
    currentWeek,
    roles,
    slotsByDayAndTime,
    onSuccess: handleNewAssignments,
    assignments,
    producers // Make sure to pass the producers state here
  });
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  // Sort timeslots to display them in chronological order
  const timeslots = scheduleSlots && Array.isArray(scheduleSlots) 
    ? [...new Set(scheduleSlots.map(slot => slot.start_time))].sort()
    : [];
  
  if (isLoading || slotsLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">סידור שבועי</h3>
      
      {!producers || producers.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>שים לב</AlertTitle>
          <AlertDescription>
            לא נמצאו מפיקים במערכת. ייתכן שיש בעיה בהגדרות המחלקה.
          </AlertDescription>
        </Alert>
      ) : null}
      
      <Card className="mb-4">
        <div className="p-2 font-bold border-b bg-slate-100">
          שבוע {format(currentWeek, 'dd/MM/yyyy', { locale: he })} - {format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he })}
        </div>
        <div className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">משבצת</TableHead>
                {/* Order days from right to left (Sunday to Saturday) */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <TableHead key={`day-header-${dayIndex}`} className="text-center min-w-[150px]">
                    {dayNames[dayIndex]}
                    <div className="text-xs font-normal">
                      {format(addDays(currentWeek, dayIndex), 'dd/MM', { locale: he })}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeslots.map((time, timeIndex) => (
                <TableRow key={`time-row-${time}-${timeIndex}`}>
                  <TableCell className="font-medium">{time}</TableCell>
                  {/* Days in RTL order (Sunday to Saturday) */}
                  {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                    const key = `${dayIndex}-${time}`;
                    const slotsForCell = slotsByDayAndTime[key] || [];
                    
                    return (
                      <TableCell 
                        key={`cell-${dayIndex}-${time}-${timeIndex}`} 
                        className="p-2 align-top cursor-pointer hover:bg-gray-50"
                      >
                        {slotsForCell.length > 0 ? (
                          <div>
                            {slotsForCell.map((slot, slotIndex) => {
                              const slotAssignments = getAssignmentsForSlot(slot.id);
                              
                              return (
                                <SlotAssignments
                                  key={`slot-${slot.id}-${time}-${slotIndex}`}
                                  slot={slot}
                                  slotAssignments={slotAssignments}
                                  onAssign={async (slot) => {
                                    await handleAssignProducer(slot, slotAssignments);
                                  }}
                                  onDeleteAssignment={handleDeleteAssignment}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs">
                            אין תוכניות
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <AssignmentDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          saveScrollPosition();
          setIsDialogOpen(open);
        }}
        currentSlot={currentSlot}
        producerForms={producerForms}
        updateProducerForm={updateProducerForm}
        visibleWorkerCount={visibleWorkerCount}
        addWorkerForm={addWorkerForm}
        removeWorkerForm={removeWorkerForm}
        selectedDays={selectedDays}
        toggleDay={toggleDay}
        isPermanent={isPermanent}
        setIsPermanent={setIsPermanent}
        handleSubmit={handleSubmit}
        handleCloseDialog={handleCloseDialog}
        producers={producers}
        roles={roles}
        currentWeek={currentWeek}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default WeeklyAssignments;
