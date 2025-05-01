
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
  const { slots: scheduleSlots, loading: slotsLoading } = useScheduleSlots(selectedDate);
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
  
  // Group slots by day
  const slotsByDay: { [key: number]: ScheduleSlot[] } = scheduleSlots.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(slot);
    return acc;
  }, {} as { [key: number]: ScheduleSlot[] });
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string) => {
    return assignments.filter((assignment) => assignment.slot_id === slotId);
  };
  
  if (isLoading || slotsLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }
  
  return (
    <div className="space-y-6 print:space-y-2">
      <h2 className="text-xl font-bold text-center mb-4 print:text-lg">
        סידור עבודה - הפקה ועריכה
        <div className="text-base font-normal print:text-sm">
          לשבוע {format(selectedDate, 'dd/MM/yyyy', { locale: he })} - {format(addDays(selectedDate, 6), 'dd/MM/yyyy', { locale: he })}
        </div>
      </h2>
      
      {dayNames.map((dayName, dayIndex) => {
        const daySlotsData = slotsByDay[dayIndex] || [];
        if (daySlotsData.length === 0) return null;
        
        // Check if there are any assignments for this day
        const hasAssignments = daySlotsData.some((slot) => getAssignmentsForSlot(slot.id).length > 0);
        if (!hasAssignments) return null;
        
        return (
          <Card key={dayIndex} className="mb-4 print:mb-2 print:shadow-none print:border">
            <div className="bg-slate-100 p-2 font-bold border-b print:text-sm">
              {dayName} - {format(addDays(selectedDate, dayIndex), 'dd/MM/yyyy', { locale: he })}
            </div>
            <Table className="print:text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="print:py-1">שעות</TableHead>
                  <TableHead className="print:py-1">שם התוכנית</TableHead>
                  <TableHead className="print:py-1">עריכה</TableHead>
                  <TableHead className="print:py-1">הפקה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daySlotsData
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((slot) => {
                    const slotAssignments = getAssignmentsForSlot(slot.id);
                    if (slotAssignments.length === 0) return null;
                    
                    // Group assignments by role
                    const editingAssignments = slotAssignments.filter(a => a.role === "עריכה");
                    const producingAssignments = slotAssignments.filter(a => a.role === "הפקה");
                    
                    return (
                      <TableRow key={slot.id}>
                        <TableCell className="print:py-1">
                          {slot.start_time} - {slot.end_time}
                        </TableCell>
                        <TableCell className="print:py-1">
                          {slot.show_name}
                        </TableCell>
                        <TableCell className="print:py-1">
                          {editingAssignments.map(a => a.worker?.name).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="print:py-1">
                          {producingAssignments.map(a => a.worker?.name).join(", ") || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        );
      })}
      
      {assignments.length === 0 && (
        <div className="text-center py-8">
          אין שיבוצים לשבוע זה
        </div>
      )}
    </div>
  );
};

export default ProducerAssignmentsView;
