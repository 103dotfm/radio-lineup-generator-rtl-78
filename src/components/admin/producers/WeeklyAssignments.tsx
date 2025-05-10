
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
import { 
  deleteProducerAssignment,
  getProducerAssignments,
  getProducerRoles,
  getProducers,
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
  const { saveScrollPosition, restoreScrollPosition } = useScroll();
  
  const { toast } = useToast();
  
  // Group slots by day and time for a more organized display
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
  }, [currentWeek, refreshTrigger]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      saveScrollPosition();
      
      // Use a consistent date format for the week start
      const weekStartDate = startOfWeek(currentWeek, { weekStartsOn: 0 });
      const formattedDate = format(weekStartDate, 'yyyy-MM-dd');
      console.log("WeeklyAssignments: Loading data for week", formattedDate);
      
      const [assignmentsData, producersData, rolesData] = await Promise.all([
        getProducerAssignments(weekStartDate),
        getProducers(),
        getProducerRoles()
      ]);
      
      console.log("WeeklyAssignments: Loaded assignments:", assignmentsData);
      console.log("WeeklyAssignments: Loaded producers:", producersData);
      console.log("WeeklyAssignments: Loaded roles:", rolesData);
      
      setAssignments(assignmentsData || []);
      setProducers(producersData || []);
      setRoles(rolesData || []);
      
      // Restore scroll position after data is loaded
      setTimeout(() => {
        restoreScrollPosition();
      }, 50);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני הסידור",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string): ProducerAssignment[] => {
    return assignments.filter((assignment) => assignment.slot_id === slotId);
  };
  
  const handleDeleteAssignment = async (assignmentId: string) => {
    saveScrollPosition();
    
    if (confirm('האם אתה בטוח שברצונך למחוק את השיבוץ?')) {
      try {
        const success = await deleteProducerAssignment(assignmentId);
        if (success) {
          toast({
            title: "נמחק בהצלחה",
            description: "השיבוץ נמחק בהצלחה"
          });
          
          saveScrollPosition();
          
          await loadData(); // Refresh the assignments immediately
          if (onAssignmentChange) {
            onAssignmentChange(); // Notify parent component
          }
          
          setTimeout(() => {
            restoreScrollPosition();
          }, 50);
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
        
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    } else {
      setTimeout(() => {
        restoreScrollPosition();
      }, 50);
    }
  };
  
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
    handleCloseDialog
  } = useAssignmentDialog({
    currentWeek,
    roles,
    slotsByDayAndTime,
    onSuccess: async () => {
      saveScrollPosition();
      
      await loadData();
      if (onAssignmentChange) {
        console.log("Notifying parent component about assignment change");
        onAssignmentChange();
      }
      
      setTimeout(() => {
        restoreScrollPosition();
      }, 50);
    }
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
                                    saveScrollPosition();
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
          
          if (!open) {
            setTimeout(() => {
              restoreScrollPosition();
            }, 100);
          }
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
        handleCloseDialog={() => {
          saveScrollPosition();
          handleCloseDialog();
          setTimeout(() => {
            restoreScrollPosition();
          }, 100);
        }}
        producers={producers}
        roles={roles}
        currentWeek={currentWeek}
      />
    </div>
  );
};

export default WeeklyAssignments;
