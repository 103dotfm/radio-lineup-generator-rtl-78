import React, { useState, useEffect } from 'react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
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
import { getProducerAssignments } from '@/lib/supabase/producers';
import { ScheduleSlot, ProducerAssignment } from '@/types/schedule';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import { useFilterWorkersByDivision } from '@/hooks/useWorkerDivisions';
import { getDivisions } from '@/lib/supabase/divisions';

interface ProducerAssignmentsViewProps {
  selectedDate: Date;
}

const ProducerAssignmentsView: React.FC<ProducerAssignmentsViewProps> = ({ selectedDate }) => {
  // Important: Use false for the second parameter to get weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(selectedDate, false);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [producerDivisionId, setProducerDivisionId] = useState<string | undefined>(undefined);
  
  // Get the producer division ID
  useEffect(() => {
    const getProducerDivisionId = async () => {
      try {
        // Try to get from localStorage first
        const cachedId = localStorage.getItem('producer-division-id');
        if (cachedId) {
          setProducerDivisionId(cachedId);
          return;
        }
        
        // If not in cache, find it from the divisions list
        const divisions = await getDivisions();
        const producerDiv = divisions.find(div => 
          div.name.toLowerCase() === 'producers' || 
          div.name.toLowerCase() === 'מפיקים' ||
          div.name.toLowerCase() === 'עורכים ומפיקים'
        );
        
        if (producerDiv) {
          setProducerDivisionId(producerDiv.id);
          localStorage.setItem('producer-division-id', producerDiv.id);
        }
      } catch (error) {
        console.error("Error getting producer division ID:", error);
      }
    };
    
    getProducerDivisionId();
  }, []);
  
  // Get producers division workers
  const { workerIds: producerWorkerIds, loading: workersLoading } = 
    useFilterWorkersByDivision(producerDivisionId);
  
  useEffect(() => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    console.log("ProducerAssignmentsView: selectedDate changed to", formattedDate);
    loadAssignments();
  }, [selectedDate]);
  
  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      // Use a consistent date format for the week start
      const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const formattedDate = format(weekStartDate, 'yyyy-MM-dd');
      console.log('ProducerAssignmentsView: Loading assignments for week starting', formattedDate);
      
      const assignmentsData = await getProducerAssignments(weekStartDate);
      console.log('ProducerAssignmentsView: Loaded assignments:', assignmentsData);
      
      // Process assignments to work with schedule slots
      if (assignmentsData && assignmentsData.length > 0) {
        setAssignments(assignmentsData);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string): ProducerAssignment[] => {
    // Filter assignments to show only those for producers division workers
    return assignments.filter((assignment) => 
      assignment.slot_id === slotId && 
      (producerWorkerIds.length === 0 || producerWorkerIds.includes(assignment.worker_id))
    );
  };

  // Helper function to calculate show duration in hours
  const getShowDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  // Helper function to check if a slot spans multiple hours
  const isLongShow = (slot: ScheduleSlot): boolean => {
    const duration = getShowDuration(slot.start_time, slot.end_time);
    return duration >= 2;
  };
  
  if (isLoading || slotsLoading || workersLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }

  // Generate all days of the week based on selectedDate
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));
  
  // Get time slots from scheduleSlots - extract unique start_time values and sort them
  const timeSlots = [...new Set(scheduleSlots.map(slot => slot.start_time))]
    .sort((a, b) => a.localeCompare(b));

  // Group slots by day and time for easier lookup
  const slotsByDayAndTime: { [key: string]: ScheduleSlot[] } = {};
  
  // Use a set to track unique show-time-day combinations
  const uniqueSlotKeys = new Set<string>();
  
  scheduleSlots.forEach(slot => {
    const key = `${slot.day_of_week}-${slot.start_time}`;
    const uniqueKey = `${slot.day_of_week}-${slot.start_time}-${slot.show_name}-${slot.host_name}`;
    
    // Only process this slot if we haven't seen a duplicate already
    if (!uniqueSlotKeys.has(uniqueKey)) {
      uniqueSlotKeys.add(uniqueKey);
      
      if (!slotsByDayAndTime[key]) {
        slotsByDayAndTime[key] = [];
      }
      slotsByDayAndTime[key].push(slot);
    }
  });

  // Filter assignments by producer division
  const validAssignments = assignments.filter(assignment => 
    assignment.slot && 
    (producerWorkerIds.length === 0 || producerWorkerIds.includes(assignment.worker_id))
  );
  
  const hasAnyAssignments = validAssignments.length > 0;
  
  if (!hasAnyAssignments) {
    return (
      <div className="space-y-6 print:space-y-2" dir="rtl">
        <h2 className="text-xl font-bold text-center mb-4 print:text-lg">
          סידור עבודה - הפקה ועריכה
          <div className="text-base font-normal print:text-sm">
            לשבוע {format(selectedDate, 'dd/MM/yyyy', { locale: he })} - {format(addDays(selectedDate, 6), 'dd/MM/yyyy', { locale: he })}
          </div>
        </h2>
        
        <div className="text-center py-8">
          אין שיבוצים לשבוע זה
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-2" dir="rtl">
      <h2 className="text-xl font-bold text-center mb-4 print:text-lg">
        סידור עבודה - הפקה ועריכה
        <div className="text-base font-normal print:text-sm">
          לשבוע {format(selectedDate, 'dd/MM/yyyy', { locale: he })} - {format(addDays(selectedDate, 6), 'dd/MM/yyyy', { locale: he })}
        </div>
      </h2>
      
      <Card className="mb-4 print:mb-2 print:shadow-none print:border">
        <div className="overflow-x-auto">
          <Table className="print:text-xs table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="print:py-1 w-20 text-center font-bold border">זמן</TableHead>
                {/* Keep days in the correct order for RTL layout */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <TableHead key={`day-${dayIndex}`} className="print:py-1 text-center w-32 font-bold border">
                    <div className="flex flex-col items-center">
                      <div className="font-bold">{dayNames[dayIndex]}</div>
                      <div className="text-sm opacity-80">{format(addDays(selectedDate, dayIndex), 'dd/MM', { locale: he })}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((timeSlot, timeIndex) => {
                // Check if this time slot should be skipped because it's part of a merged cell
                const shouldSkip = timeSlots.some((prevTimeSlot, prevIndex) => {
                  if (prevIndex >= timeIndex) return false;
                  
                  return [0, 1, 2, 3, 4, 5, 6].some(dayIndex => {
                    const prevKey = `${dayIndex}-${prevTimeSlot}`;
                    const prevSlotsForCell = slotsByDayAndTime[prevKey] || [];
                    
                    return prevSlotsForCell.some(prevSlot => {
                      const prevSlotAssignments = getAssignmentsForSlot(prevSlot.id);
                      if (prevSlotAssignments.length === 0) return false;
                      
                      const duration = getShowDuration(prevSlot.start_time, prevSlot.end_time);
                      if (duration < 2) return false;
                      
                      // Check if current timeSlot falls within the duration of prevSlot
                      const prevStartTime = new Date(`2000-01-01T${prevSlot.start_time}`);
                      const currentTime = new Date(`2000-01-01T${timeSlot}`);
                      const prevEndTime = new Date(`2000-01-01T${prevSlot.end_time}`);
                      
                      return currentTime > prevStartTime && currentTime < prevEndTime;
                    });
                  });
                });
                
                if (shouldSkip) return null;

                return (
                  <TableRow key={`timeslot-${timeSlot}`} className="border">
                    <TableCell className="print:py-1 font-medium text-center border bg-gray-50 w-20">
                      {timeSlot}
                    </TableCell>
                    {/* Days in correct order for RTL */}
                    {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                      const key = `${dayIndex}-${timeSlot}`;
                      const slotsForCell = slotsByDayAndTime[key] || [];
                      
                      return (
                        <TableCell key={`cell-${dayIndex}-${timeSlot}`} className="print:py-1 border align-top w-32 p-2">
                          {slotsForCell.map((slot) => {
                            // Find assignments for this specific slot
                            const slotAssignments = getAssignmentsForSlot(slot.id);
                            if (slotAssignments.length === 0) return null;
                            
                            const duration = getShowDuration(slot.start_time, slot.end_time);
                            const isLong = duration >= 2;
                            
                            // Group assignments by role
                            const assignmentsByRole: Record<string, ProducerAssignment[]> = {};
                            
                            // Make sure we properly handle the grouping by role
                            slotAssignments.forEach(assignment => {
                              const role = assignment.role || 'ללא תפקיד';
                              if (!assignmentsByRole[role]) {
                                assignmentsByRole[role] = [];
                              }
                              assignmentsByRole[role].push(assignment);
                            });
                            
                            return (
                              <div 
                                key={`assignment-slot-${slot.id}-${timeSlot}`} 
                                className={`text-sm border rounded p-2 mb-1 last:mb-0 ${
                                  isLong ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                }`}
                                style={isLong ? { 
                                  minHeight: `${Math.ceil(duration) * 60}px`,
                                  position: 'relative'
                                } : {}}
                              >
                                <div className="font-semibold text-center mb-2 text-blue-800 border-b border-blue-200 pb-1">
                                  {getCombinedShowDisplay(slot.show_name, slot.host_name)}
                                </div>
                                
                                {isLong && (
                                  <div className="text-xs text-center text-blue-600 mb-2 font-medium">
                                    {slot.start_time} - {slot.end_time}
                                  </div>
                                )}
                                
                                <div className="space-y-1">
                                  {Object.entries(assignmentsByRole).map(([role, roleAssignments]) => (
                                    <div key={`role-${role}-${slot.id}`} className="text-xs">
                                      <span className="font-semibold text-gray-700">{role}: </span>
                                      <span className="text-gray-900">
                                        {roleAssignments.map((a, idx) => (
                                          <span key={`worker-${a.id}-${idx}`}>
                                            {a.worker?.name}
                                            {idx < roleAssignments.length - 1 ? ", " : ""}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ProducerAssignmentsView;
