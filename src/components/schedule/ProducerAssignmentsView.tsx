
import React, { useState, useEffect } from 'react';
import { format, parseISO, addDays } from 'date-fns';
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
import { ScheduleSlot, ProducerAssignment as ScheduleProducerAssignment } from '@/types/schedule';
import { ProducerAssignment as ApiProducerAssignment } from '@/lib/supabase/producers';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { getCombinedShowDisplay } from '@/utils/showDisplay';

interface ProducerAssignmentsViewProps {
  selectedDate: Date;
}

const ProducerAssignmentsView: React.FC<ProducerAssignmentsViewProps> = ({ selectedDate }) => {
  // Important: Use false for the second parameter to get weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(selectedDate, false);
  const [assignments, setAssignments] = useState<ScheduleProducerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadAssignments();
  }, [selectedDate]);
  
  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      // Get assignments data
      const assignmentsData = await getProducerAssignments(selectedDate);
      
      // Process assignments to work with schedule slots
      if (assignmentsData && assignmentsData.length > 0) {
        // For each assignment, match it with its corresponding slot in scheduleSlots
        const processedAssignments = assignmentsData.map(assignment => {
          // Find matching slot in scheduleSlots by slot_id
          const matchingSlot = scheduleSlots.find(slot => slot.id === assignment.slot_id);
          
          // Convert API ProducerAssignment to ScheduleProducerAssignment
          const convertedAssignment: ScheduleProducerAssignment = {
            id: assignment.id,
            slot_id: assignment.slot_id,
            worker_id: assignment.worker_id,
            role: assignment.role,
            notes: assignment.notes,
            is_recurring: assignment.is_recurring,
            week_start: assignment.week_start,
            worker: assignment.worker,
            slot: matchingSlot || null,
            created_at: assignment.created_at,
            updated_at: assignment.updated_at
          };
          
          return convertedAssignment;
        });
        
        setAssignments(processedAssignments);
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
  const getAssignmentsForSlot = (slotId: string): ScheduleProducerAssignment[] => {
    return assignments.filter((assignment) => assignment.slot_id === slotId);
  };
  
  if (isLoading || slotsLoading) {
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

  // Check if there are any assignments - use valid assignments
  const validAssignments = assignments.filter(assignment => 
    assignment.slot || scheduleSlots.some(slot => slot.id === assignment.slot_id)
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
        <Table className="print:text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="print:py-1">משבצת</TableHead>
              {/* Keep days in the correct order for RTL layout */}
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                <TableHead key={`day-${dayIndex}`} className="print:py-1 text-center">
                  {dayNames[dayIndex]} - {format(addDays(selectedDate, dayIndex), 'dd/MM', { locale: he })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeSlots.map((timeSlot) => (
              <TableRow key={`timeslot-${timeSlot}`}>
                <TableCell className="print:py-1 font-medium">{timeSlot}</TableCell>
                {/* Days in correct order for RTL */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const key = `${dayIndex}-${timeSlot}`;
                  const slotsForCell = slotsByDayAndTime[key] || [];
                  
                  return (
                    <TableCell key={`cell-${dayIndex}-${timeSlot}`} className="print:py-1">
                      {slotsForCell.map((slot) => {
                        const slotAssignments = getAssignmentsForSlot(slot.id);
                        if (slotAssignments.length === 0) return null;
                        
                        // Group assignments by role
                        const assignmentsByRole: Record<string, ScheduleProducerAssignment[]> = {};
                        
                        // Make sure we properly handle the grouping by role
                        slotAssignments.forEach(assignment => {
                          const role = assignment.role || 'ללא תפקיד';
                          if (!assignmentsByRole[role]) {
                            assignmentsByRole[role] = [];
                          }
                          assignmentsByRole[role].push(assignment);
                        });
                        
                        return (
                          <div key={`assignment-slot-${slot.id}-${timeSlot}`} className="p-1 text-sm">
                            <div className="font-medium">
                              {getCombinedShowDisplay(slot.show_name, slot.host_name)}
                            </div>
                            
                            {Object.entries(assignmentsByRole).map(([role, roleAssignments]) => (
                              <div key={`role-${role}-${slot.id}`} className="mt-1">
                                <span className="font-medium text-xs">{role}: </span>
                                {roleAssignments.map((a, idx) => (
                                  <span key={`worker-${a.id}-${idx}`}>
                                    {a.worker?.name}
                                    {idx < roleAssignments.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ProducerAssignmentsView;
