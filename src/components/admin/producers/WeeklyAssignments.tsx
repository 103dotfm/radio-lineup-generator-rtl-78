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

interface WeeklyAssignmentsProps {
  currentWeek: Date;
  onAssignmentChange?: () => void;
  refreshTrigger?: number;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ 
  currentWeek, 
  onAssignmentChange,
  refreshTrigger = 0
}) => {
  // Important: use false for isMasterSchedule to get the weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(currentWeek, false);
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
      console.log('Found cached producer division ID:', cachedId);
      setProducerDivisionId(cachedId);
    } else {
      console.log('No cached producer division ID found');
    }
  }, []);

  const { toast } = useToast();
  
  // Group slots by day and time for a more organized display and to support the multi-day assignment feature
  const slotsByDayAndTime: { [key: string]: ScheduleSlot[] } = {};
  
  // Create a map of unique slots to prevent duplicates
  const uniqueSlotsMap: { [key: string]: boolean } = {};
  
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
  
  useEffect(() => {
    // Format date consistently for logging
    const formattedDate = format(currentWeek, 'yyyy-MM-dd');
    console.log("WeeklyAssignments: Loading data for week", formattedDate);
    
    saveScrollPosition();
    loadData();
  }, [currentWeek, refreshTrigger, producerDivisionId]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use a consistent date format for the week start
      const weekStartDate = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const formattedDate = format(weekStartDate, 'yyyy-MM-dd');
      console.log("WeeklyAssignments: Loading data for week", formattedDate);
      
      // Get assignments
      const assignmentsData = await getProducerAssignments(weekStartDate);
      console.log("WeeklyAssignments: Loaded assignments:", assignmentsData);
      setAssignments(assignmentsData || []);
      
      // Get roles - get them sorted by display_order
      const rolesData = await getProducerRoles();
      console.log("WeeklyAssignments: Loaded roles:", rolesData);
      setRoles(rolesData || []);
      
      // Get producers filtered by division or department
      console.log("Fetching producers with ID:", producerDivisionId);
      const producersData = await getProducersByDivision(producerDivisionId || 'producers-default');
      console.log(`WeeklyAssignments: Loaded ${producersData?.length || 0} producers:`);
      setProducers(producersData || []);
      
      if (!producersData?.length) {
        console.warn("No producers found! This is unexpected.");
        toast({
          title: "שים לב",
          description: "לא נמצאו מפיקים במערכת. ייתכן שיש בעיה בהגדרות המחלקה",
          variant: "default"
        });
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
  
  // Get assignments for a slot
  const getAssignmentsForSlot = useCallback((slotId: string): ProducerAssignment[] => {
    return assignments.filter((assignment) => assignment.slot_id === slotId);
  }, [assignments]);
  
  const handleDeleteAssignment = async (assignmentId: string, deleteMode: 'current' | 'future' = 'current') => {
    saveScrollPosition();
    setIsScrollLocked(true);
    
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      
      if (!assignment) {
        throw new Error("Assignment not found");
      }
      
      const success = await deleteProducerAssignment(assignmentId, deleteMode);
      
      if (success) {
        toast({
          title: "נמחק בהצלחה",
          description: deleteMode === 'future' 
            ? "השיבוץ נמחק מכל השבועות העתידיים" 
            : "השיבוץ נמחק משבוע זה בלבד"
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
    
    console.log('Locally updating assignments with new data:', newAssignments);
    
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
    
    // Notify parent without triggering a full data reload
    if (onAssignmentChange) {
      console.log("Notifying parent component about assignment change");
      onAssignmentChange();
    }
  }, [onAssignmentChange]);
  
  // Use the custom hook for dialog management and assignment operations
  const {
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
  const timeslots = [...new Set(scheduleSlots.map(slot => slot.start_time))].sort();
  
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
                                  onAssign={(slot) => {
                                    handleAssignProducer(slot, slotAssignments);
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
