
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

interface ProducerAssignmentsViewProps {
  selectedDate: Date;
}

const ProducerAssignmentsView: React.FC<ProducerAssignmentsViewProps> = ({ selectedDate }) => {
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(selectedDate);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadAssignments();
  }, [selectedDate]);
  
  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const assignmentsData = await getProducerAssignments(selectedDate);
      setAssignments(assignmentsData);
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
              {dayNames.map((day, index) => (
                <TableHead key={index} className="print:py-1 text-center">
                  {day} - {format(addDays(selectedDate, index), 'dd/MM', { locale: he })}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeSlots.map((timeSlot) => (
              <TableRow key={timeSlot}>
                <TableCell className="print:py-1 font-medium">{timeSlot}</TableCell>
                {weekDays.map((day, dayIndex) => {
                  // Find slots for this day at this time
                  const key = `${dayIndex}-${timeSlot}`;
                  const daySlots = slotsByDayAndTime[key] || [];
                  
                  return (
                    <TableCell key={dayIndex} className="print:py-1">
                      {daySlots.map(slot => {
                        if (!slot || !slot.id) return null;
                        
                        const slotAssignments = getAssignmentsForSlot(slot.id);
                        if (slotAssignments.length === 0) return null;
                        
                        // Group assignments by role
                        const editingAssignments = slotAssignments.filter(a => a.role === "עריכה");
                        const producingAssignments = slotAssignments.filter(a => a.role === "הפקה");
                        
                        return (
                          <div key={slot.id} className="p-1 text-sm">
                            <div className="font-medium">
                              {slot.show_name}
                              {slot.host_name && (
                                <span className="text-xs text-gray-500"> ({slot.host_name})</span>
                              )}
                            </div>
                            {producingAssignments.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium text-xs">הפקה: </span>
                                {producingAssignments.map(a => a.worker?.name).join(", ")}
                              </div>
                            )}
                            {editingAssignments.length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium text-xs">עריכה: </span>
                                {editingAssignments.map(a => a.worker?.name).join(", ")}
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
