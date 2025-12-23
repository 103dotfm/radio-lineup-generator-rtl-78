
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
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { getProducerAssignments } from '@/lib/supabase/producers';
import { ScheduleSlot, ProducerAssignment } from '@/types/schedule';
import { useScheduleSlots } from './hooks/useScheduleSlots';
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import { useFilterWorkersByDivision } from '@/hooks/useWorkerDivisions';
import { getDivisions } from '@/lib/supabase/divisions';
import { api } from '@/lib/api-client';

interface ProducerAssignmentsViewProps {
  selectedDate: Date;
}

interface WorkArrangement {
  id: string;
  type: string;
  week_start: string;
  filename: string;
  url: string;
  created_at?: string;
  updated_at?: string;
}

const ProducerAssignmentsView: React.FC<ProducerAssignmentsViewProps> = ({ selectedDate }) => {
  // Important: Use false for the second parameter to get weekly schedule instead of master
  const { slots: scheduleSlots, loading: slotsLoading } = useScheduleSlots(selectedDate, false);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [producerDivisionId, setProducerDivisionId] = useState<string | undefined>(undefined);
  
  // Get the producer division ID
  useEffect(() => {
    const getProducerDivisionId = async () => {
      try {
        // Clear cache to ensure we get fresh data
        localStorage.removeItem('producer-division-id');
        
        // Find it from the divisions list
        const divisions = await getDivisions();
        console.log('ProducerAssignmentsView: All divisions:', divisions);
        
        const producerDiv = divisions.find(div => 
          div.name.toLowerCase() === 'producers' || 
          div.name.toLowerCase() === 'מפיקים' ||
          div.name.toLowerCase() === 'עורכים ומפיקים'
        );
        
        if (producerDiv) {
          console.log('ProducerAssignmentsView: Found producer division:', producerDiv);
          setProducerDivisionId(producerDiv.id);
          localStorage.setItem('producer-division-id', producerDiv.id);
        } else {
          console.log('ProducerAssignmentsView: No producer division found');
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
    
  console.log('ProducerAssignmentsView: Debug info:', {
    producerDivisionId,
    producerWorkerIds: producerWorkerIds.length,
    workersLoading
  });
  
  useEffect(() => {
    loadData();
  }, [selectedDate, producerDivisionId]);
  
    const loadData = async () => {
    setIsLoading(true);
    try {
      // Use a consistent date format for the week start
      const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const formattedDate = format(weekStartDate, 'yyyy-MM-dd');
      
      console.log('ProducerAssignmentsView: Loading data for week:', formattedDate);
  
      // Load producer assignments
      const assignmentsData = await getProducerAssignments(weekStartDate);
      console.log('ProducerAssignmentsView: Loaded assignments:', assignmentsData);
      
      // Process assignments to work with schedule slots
      if (assignmentsData && assignmentsData.length > 0) {
        setAssignments(assignmentsData);
      } else {
        setAssignments([]);
      }

      // PDF work arrangements are only for engineers, not for producers
      setWorkArrangement(null);
    } catch (error) {
      console.error("Error loading data:", error);
      setAssignments([]);
      setWorkArrangement(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  // Get assignments for a slot (includes recurring/permanent by matching day/time/show)
  const getAssignmentsForSlot = (slotId: string): ProducerAssignment[] => {
    const slot = scheduleSlots?.find(s => s.id === slotId);
    if (!slot) {
      return [];
    }

    // Direct matches by slot_id (weekly assignments)
    const directMatches = assignments.filter(assignment =>
      assignment.slot_id === slotId &&
      (producerWorkerIds.length === 0 || producerWorkerIds.includes(assignment.worker_id))
    );

    // Recurring/permanent matches by day_of_week, start_time, show_name
    const recurringMatches = assignments.filter(assignment => {
      if (!assignment.is_recurring) return false;
      const a: any = assignment;
      const matchesSlotCharacteristics =
        a.day_of_week === slot.day_of_week &&
        a.start_time === (slot as any).start_time &&
        a.show_name === (slot as any).show_name;
      const matchesDivision =
        producerWorkerIds.length === 0 || producerWorkerIds.includes(assignment.worker_id);
      return matchesSlotCharacteristics && matchesDivision;
    });

    // For weekly assignments, also match by slot characteristics if slot_id doesn't match
    // This handles cases where assignments were created for different slot IDs but same show
    const characteristicMatches = assignments.filter(assignment => {
      if (assignment.is_recurring) return false; // Skip recurring assignments (already handled above)
      
      const a: any = assignment;
      const matchesSlotCharacteristics =
        a.day_of_week === slot.day_of_week &&
        a.start_time === (slot as any).start_time &&
        a.show_name === (slot as any).show_name;
      const matchesDivision =
        producerWorkerIds.length === 0 || producerWorkerIds.includes(assignment.worker_id);
      
      // Only include if it matches characteristics and wasn't already found by slot_id
      return matchesSlotCharacteristics && matchesDivision && !directMatches.some(direct => direct.id === assignment.id);
    });

    // Combine, avoiding duplicates by assignment id
    const combined: ProducerAssignment[] = [...directMatches];
    recurringMatches.forEach(r => {
      if (!combined.some(d => d.id === r.id)) {
        combined.push(r);
      }
    });
    characteristicMatches.forEach(charMatch => {
      if (!combined.some(d => d.id === charMatch.id)) {
        combined.push(charMatch);
      }
    });

    return combined;
  };

  const handleDownloadPDF = () => {
    if (workArrangement) {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = workArrangement.url;
      link.download = workArrangement.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  if (isLoading || slotsLoading || workersLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }

  // Generate all days of the week based on selectedDate
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));
  
  // Get time slots from scheduleSlots - extract unique start_time values and sort them
  // Put 00:00 at the bottom, all others in ascending order
  const timeSlots = scheduleSlots ? [...new Set(scheduleSlots.map(slot => slot.start_time))]
    .sort((a, b) => {
      const timeA = String(a);
      const timeB = String(b);
      // Put 00:00 at the bottom
      if (timeA === '00:00:00') return 1;
      if (timeB === '00:00:00') return -1;
      return timeA.localeCompare(timeB);
    }) : [];

  // Group slots by day and time for easier lookup
  const slotsByDayAndTime: { [key: string]: ScheduleSlot[] } = {};
  
  // Use a set to track unique show-time-day combinations
  const uniqueSlotKeys = new Set<string>();
  
  scheduleSlots?.forEach(slot => {
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
    assignment.slot_id && 
    (producerWorkerIds.length === 0 || producerWorkerIds.includes(assignment.worker_id))
  );
  
  console.log('ProducerAssignmentsView: Debug info:', {
    totalAssignments: assignments.length,
    validAssignments: validAssignments.length,
    producerWorkerIds: producerWorkerIds.length,
    hasWorkArrangement: workArrangement !== null,
    workArrangement: workArrangement
  });
  
  const hasAnyAssignments = validAssignments.length > 0;
  
  // If there are assignments, show them
  if (hasAnyAssignments) {
    const dateDisplay = `${format(addDays(selectedDate, 6), 'dd', { locale: he })}-${format(selectedDate, 'dd', { locale: he })} ב${format(selectedDate, 'MMMM yyyy', { locale: he })}`;
    
    return (
      <div className="space-y-6 print:space-y-2" dir="rtl">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 digital-work-header">
          <h2 className="text-2xl font-bold mb-2 md:mb-0 flex items-center digital-work-title">
            <Calendar className="h-5 w-5 mr-2 text-blue-600 mx-[17px]" />
            סידור עבודה עורכים ומפיקים
          </h2>
          <div className="text-lg font-medium bg-blue-50 py-1.5 rounded-full text-blue-700 flex items-center digital-work-date px-[33px]">
            <Calendar className="h-4 w-4 mr-2 mx-[9px]" />
            {dateDisplay}
          </div>
        </div>
        
        <Card className="mb-4 print:mb-2 print:shadow-none print:border">
          <div className="grid grid-cols-[auto,repeat(7,1fr)] auto-rows-auto" dir="rtl">
            {/* Header row */}
            <div className="p-2 font-bold text-center border-b border-r bg-black text-white digital-header-cell">
              שעה
            </div>
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
              <div key={`day-${dayIndex}`} className="p-2 text-center border-b border-r bg-black text-white font-bold digital-header-cell">
                <div className="date-header">
                  <div className="date-day">{dayNames[dayIndex]}</div>
                  <div className="date-number text-sm opacity-80">{format(addDays(selectedDate, dayIndex), 'dd/MM', { locale: he })}</div>
                </div>
              </div>
            ))}
            
            {/* Time slots */}
            {timeSlots.map((timeSlot, timeIndex) => {
              const timeStr = String(timeSlot);
              const formattedTime = timeStr.substring(0, 5);
              
              return (
                <React.Fragment key={`timeslot-${String(timeSlot)}`}>
                  {/* Time column */}
                  <div className="p-2 text-center border-b border-r bg-gray-50 font-medium min-h-[60px] flex items-center justify-center">
                    {formattedTime}
                  </div>
                  
                  {/* Day columns */}
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                    const key = `${dayIndex}-${String(timeSlot)}`;
                    const slotsForCell = slotsByDayAndTime[key] || [];
                    
                    // Check if this is the start of a show
                    const startSlot = slotsForCell.find(slot => String(slot.start_time) === String(timeSlot));
                    
                    if (!startSlot) {
                      // No show at this time slot
                      return <div key={`cell-${dayIndex}-${String(timeSlot)}`} className="p-2 border-b border-r min-h-[60px]"></div>;
                    }
                    
                    const slotAssignments = getAssignmentsForSlot(startSlot.id);
                    
                    if (slotAssignments.length === 0) {
                      return <div key={`cell-${dayIndex}-${String(timeSlot)}`} className="p-2 border-b border-r min-h-[60px]"></div>;
                    }
                    
                    // Calculate duration for height
                    const startTime = new Date(`2000-01-01T${startSlot.start_time}`);
                    const endTime = new Date(`2000-01-01T${startSlot.end_time}`);
                    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                    const cellHeight = Math.max(60, Math.ceil(durationHours) * 60); // 60px per hour
                    
                    // Debug logging
                    console.log(`Show: ${startSlot.show_name}, Start: ${startSlot.start_time}, End: ${startSlot.end_time}, Duration: ${durationHours}h, Height: ${cellHeight}px`);
                    
                    // Group assignments by role
                    const assignmentsByRole: Record<string, ProducerAssignment[]> = {};
                    slotAssignments.forEach(assignment => {
                      const role = assignment.role || 'ללא תפקיד';
                      if (!assignmentsByRole[role]) {
                        assignmentsByRole[role] = [];
                      }
                      assignmentsByRole[role].push(assignment);
                    });
                    
                    return (
                      <div 
                        key={`cell-${dayIndex}-${String(timeSlot)}`} 
                        className="p-2 border-b border-r relative"
                        style={{ 
                          minHeight: `${cellHeight}px`
                        }}
                      >
                        <div className="p-1 text-sm border rounded bg-blue-50 h-full flex flex-col justify-center">
                          <div className="font-black">
                            {getCombinedShowDisplay(startSlot.show_name, startSlot.host_name)}
                          </div>
                          
                          {Object.entries(assignmentsByRole).map(([role, roleAssignments]) => (
                            <div key={`role-${role}-${startSlot.id}`} className="mt-1">
                              <span className="font-black text-xs">{role}: </span>
                              {roleAssignments.map((a, idx) => (
                                <span key={`worker-${a.id}-${idx}`} style={{ fontSize: '0.9em' }}>
                                  {a.worker?.name}
                                  {idx < roleAssignments.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }
  
  // If neither assignments nor work arrangement exists, show the no shows message
  const dateDisplay = `${format(addDays(selectedDate, 6), 'dd', { locale: he })}-${format(selectedDate, 'dd', { locale: he })} ב${format(selectedDate, 'MMMM yyyy', { locale: he })}`;
  
  return (
    <div className="space-y-6 print:space-y-2" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 digital-work-header">
        <h2 className="text-2xl font-bold mb-2 md:mb-0 flex items-center digital-work-title">
          <Calendar className="h-5 w-5 mr-2 text-blue-600 mx-[17px]" />
          סידור עבודה עורכים ומפיקים
        </h2>
        <div className="text-lg font-medium bg-blue-50 py-1.5 rounded-full text-blue-700 flex items-center digital-work-date px-[33px]">
          <Calendar className="h-4 w-4 mr-2 mx-[9px]" />
          {dateDisplay}
        </div>
      </div>
      
      <div className="text-center py-8">
        <div className="space-y-4">
          <FileText className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-600">אין שיבוצים לשבוע זה</h3>
          <p className="text-muted-foreground">
            לא נמצאו סידורי עבודה או הקצאות מפיקים לשבוע זה
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProducerAssignmentsView;
