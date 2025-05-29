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
import { useFilterWorkersByDivision } from '@/hooks/useFilterWorkersByDivision';
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
  
  // Get ALL time slots from scheduleSlots and sort them properly (midnight at end)
  const allTimeSlots = [...new Set(scheduleSlots.map(slot => slot.start_time))]
    .sort((a, b) => {
      // Special handling for midnight (00:00) - put it last
      if (a === '00:00:00' && b !== '00:00:00') return 1;
      if (b === '00:00:00' && a !== '00:00:00') return -1;
      return a.localeCompare(b);
    });

  console.log('All time slots:', allTimeSlots);
  console.log('All schedule slots:', scheduleSlots);

  // Group slots by day and time for easier lookup
  const slotsByDayAndTime: { [key: string]: ScheduleSlot[] } = {};
  
  scheduleSlots.forEach(slot => {
    const key = `${slot.day_of_week}-${slot.start_time}`;
    
    if (!slotsByDayAndTime[key]) {
      slotsByDayAndTime[key] = [];
    }
    slotsByDayAndTime[key].push(slot);
  });

  console.log('Slots grouped by day and time:', slotsByDayAndTime);

  return (
    <div className="space-y-6 print:space-y-2" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold print:text-2xl text-gray-800">
          סידור עבודה עורכים ומפיקים
        </h1>
        <h2 className="text-xl print:text-lg text-gray-600">
          רדיו 103FM
        </h2>
        <div className="text-lg print:text-base text-gray-600">
          שבוע {format(selectedDate, 'dd/MM/yyyy', { locale: he })} - {format(addDays(selectedDate, 6), 'dd/MM/yyyy', { locale: he })}
        </div>
      </div>
      
      <Card className="mb-4 print:mb-2 print:shadow-none print:border">
        <div className="overflow-x-auto">
          <table className="producer-assignments-table w-full">
            <thead>
              <tr>
                <th className="time-cell">זמן</th>
                {/* Keep days in the correct order for RTL layout */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <th key={`day-${dayIndex}`} className="day-cell">
                    <div className="text-center">
                      <div className="font-bold">{dayNames[dayIndex]}</div>
                      <div className="text-sm opacity-80">{format(addDays(selectedDate, dayIndex), 'dd/MM', { locale: he })}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allTimeSlots.map((timeSlot, timeIndex) => {
                // Check if this time slot should be skipped because it's part of a merged cell
                const shouldSkip = allTimeSlots.some((prevTimeSlot, prevIndex) => {
                  if (prevIndex >= timeIndex) return false;
                  
                  return [0, 1, 2, 3, 4, 5, 6].some(dayIndex => {
                    const prevKey = `${dayIndex}-${prevTimeSlot}`;
                    const prevSlotsForCell = slotsByDayAndTime[prevKey] || [];
                    
                    return prevSlotsForCell.some(prevSlot => {
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
                  <tr key={`timeslot-${timeSlot}`}>
                    <td className="time-cell">
                      {timeSlot.substring(0, 5)}
                    </td>
                    {/* Days in correct order for RTL */}
                    {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                      const key = `${dayIndex}-${timeSlot}`;
                      const slotsForCell = slotsByDayAndTime[key] || [];
                      
                      return (
                        <td key={`cell-${dayIndex}-${timeSlot}`} className="day-cell">
                          {slotsForCell.map((slot) => {
                            // Find assignments for this specific slot
                            const slotAssignments = getAssignmentsForSlot(slot.id);
                            
                            // Show the slot even if there are no assignments, to display all shows
                            const duration = getShowDuration(slot.start_time, slot.end_time);
                            const isLong = duration >= 2;
                            
                            return (
                              <div 
                                key={`slot-${slot.id}-${timeSlot}`} 
                                className={`show-card ${isLong ? 'long-show' : ''}`}
                              >
                                <div className="show-title">
                                  {getCombinedShowDisplay(slot.show_name, slot.host_name)}
                                </div>
                                
                                {slotAssignments.length > 0 && (
                                  <div className="space-y-1">
                                    {/* Group assignments by role */}
                                    {Object.entries(
                                      slotAssignments.reduce((acc, assignment) => {
                                        const role = assignment.role || 'ללא תפקיד';
                                        if (!acc[role]) acc[role] = [];
                                        acc[role].push(assignment);
                                        return acc;
                                      }, {} as Record<string, ProducerAssignment[]>)
                                    ).map(([role, roleAssignments]) => (
                                      <div key={`role-${role}-${slot.id}`} className="assignment-role">
                                        <span className="role-name">{role}: </span>
                                        <span className="worker-names">
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
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ProducerAssignmentsView;
