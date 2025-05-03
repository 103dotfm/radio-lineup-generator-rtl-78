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
import { ScheduleSlot } from '@/types/schedule';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { getCombinedShowDisplay } from '@/utils/showDisplay';

interface ProducerAssignmentsViewProps {
  selectedDate: Date;
}

const ProducerAssignmentsView: React.FC<ProducerAssignmentsViewProps> = ({ selectedDate }) => {
  // Important: Use false for the second parameter to get weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(selectedDate, false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadAssignments();
  }, [selectedDate]);
  
  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const assignmentsData = await getProducerAssignments(selectedDate);
      
      // Deduplicate assignments based on slot_id, worker_id, and role
      // This prevents showing the same worker multiple times for the same slot and role
      const uniqueKeyMap = new Map();
      const uniqueAssignments = assignmentsData.filter(assignment => {
        const key = `${assignment.slot_id}-${assignment.worker_id}-${assignment.role}`;
        if (uniqueKeyMap.has(key)) {
          return false;
        }
        uniqueKeyMap.set(key, true);
        return true;
      });
      
      setAssignments(uniqueAssignments);
    } catch (error) {
      console.error("Error loading assignments:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string) => {
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
  scheduleSlots.forEach(slot => {
    const key = `${slot.day_of_week}-${slot.start_time}`;
    if (!slotsByDayAndTime[key]) {
      slotsByDayAndTime[key] = [];
    }
    slotsByDayAndTime[key].push(slot);
  });

  // Check if there are any assignments
  const hasAnyAssignments = assignments.length > 0;
  
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
            {timeSlots.map((timeSlot, tsIndex) => (
              <TableRow key={`timeslot-${timeSlot}-${tsIndex}`}>
                <TableCell className="print:py-1 font-medium">{timeSlot}</TableCell>
                {/* Days in correct order for RTL */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  // Find slots for this day at this time
                  const key = `${dayIndex}-${timeSlot}`;
                  const daySlots = slotsByDayAndTime[key] || [];
                  
                  return (
                    <TableCell key={`cell-${dayIndex}-${timeSlot}-${tsIndex}`} className="print:py-1">
                      {daySlots.map((slot, slotIndex) => {
                        if (!slot || !slot.id) return null;
                        
                        const slotAssignments = getAssignmentsForSlot(slot.id);
                        if (slotAssignments.length === 0) return null;
                        
                        // Group assignments by role
                        const editingAssignments = slotAssignments.filter(a => a.role === "עריכה");
                        const producingAssignments = slotAssignments.filter(a => a.role === "הפקה");
                        
                        return (
                          <div key={`assignment-slot-${slot.id}-${slotIndex}`} className="p-1 text-sm">
                            <div className="font-medium">
                              {getCombinedShowDisplay(slot.show_name, slot.host_name)}
                            </div>
                            {producingAssignments.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium text-xs">הפקה: </span>
                                {producingAssignments.map((a, idx) => 
                                  <span key={`producer-${a.id}-${idx}`}>{a.worker?.name}{idx < producingAssignments.length - 1 ? ", " : ""}</span>
                                )}
                              </div>
                            )}
                            {editingAssignments.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium text-xs">עריכה: </span>
                                {editingAssignments.map((a, idx) => 
                                  <span key={`editor-${a.id}-${idx}`}>{a.worker?.name}{idx < editingAssignments.length - 1 ? ", " : ""}</span>
                                )}
                              </div>
                            )}
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
