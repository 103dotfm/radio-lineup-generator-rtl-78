
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, addDays, parseISO, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Worker, getWorkers, getWorkersByIds } from '@/lib/supabase/workers';
import { getWorkersByDivisionId } from '@/lib/supabase/divisions';
import { 
  getProducerAssignments,
  assignProducerToSlot,
  removeAssignment,
  ProducerAssignment
} from '@/lib/supabase/producers';
import { supabase } from "@/lib/supabase";

// Producer department ID - replace with your actual producer division ID
const PRODUCER_DIVISION_ID = "223e4567-e89b-12d3-a456-426614174000"; // Replace with actual producer division ID

interface WeeklyAssignmentsProps {
  currentWeek: Date;
}

interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ currentWeek }) => {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load workers from producer division
        const producerWorkerIds = await getWorkersByDivisionId(PRODUCER_DIVISION_ID);
        let producerWorkers: Worker[] = [];
        
        if (producerWorkerIds.length > 0) {
          producerWorkers = await getWorkersByIds(producerWorkerIds);
          console.log(`Loaded ${producerWorkers.length} workers from producer division`);
        } else {
          console.log('No workers found in producer division');
        }
        
        setWorkers(producerWorkers);
        
        // Load schedule slots
        const { data: scheduleSlots, error: slotsError } = await supabase
          .from('schedule_slots')
          .select('id, show_name, host_name, day_of_week, start_time, end_time')
          .order('start_time');
        
        if (slotsError) {
          throw new Error(`Error loading slots: ${slotsError.message}`);
        }
        
        setSlots(scheduleSlots || []);
        
        // Load existing assignments
        const currentAssignments = await getProducerAssignments(currentWeek);
        setAssignments(currentAssignments);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את הנתונים",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentWeek, toast]);
  
  const handleAssignProducer = async (slotId: string, dayIndex: number, workerId: string, role: string) => {
    const saveKey = `${slotId}-${dayIndex}-${role}`;
    setSaving(prev => ({ ...prev, [saveKey]: true }));
    
    try {
      // Calculate the actual date for this slot based on day of week and current week
      const slotDate = addDays(currentWeek, dayIndex);
      const weekStartStr = format(startOfWeek(currentWeek), 'yyyy-MM-dd');
      
      // Check if this is a request to remove assignment
      if (workerId === "none") {
        // Find the existing assignment to remove
        const existingAssignment = assignments.find(
          a => a.slot_id === slotId && a.role === role && a.week_start === weekStartStr
        );
        
        if (existingAssignment) {
          await removeAssignment(existingAssignment.id);
          // Update local state by removing the assignment
          setAssignments(prev => prev.filter(a => a.id !== existingAssignment.id));
          
          toast({
            title: "בוצע",
            description: "השיבוץ הוסר בהצלחה",
          });
        }
        
        // No need to continue further since we're removing the assignment
        setSaving(prev => ({ ...prev, [saveKey]: false }));
        return;
      }
      
      // Save the assignment to the database
      const success = await assignProducerToSlot(slotId, workerId, role, weekStartStr);
      
      if (success) {
        // Update the local state to reflect the change
        const updatedAssignments = [...assignments];
        
        // Check if this combination already exists
        const existingIndex = updatedAssignments.findIndex(
          a => a.slot_id === slotId && a.role === role && a.week_start === weekStartStr
        );
        
        if (existingIndex >= 0) {
          // Update existing
          updatedAssignments[existingIndex].worker_id = workerId;
        } else if (workerId) {
          // Add new assignment only if worker is selected
          const worker = workers.find(w => w.id === workerId);
          const slot = slots.find(s => s.id === slotId);
          
          if (worker && slot) {
            updatedAssignments.push({
              id: `temp-${Date.now()}`, // Will be replaced with actual ID on refresh
              slot_id: slotId,
              worker_id: workerId,
              role: role,
              week_start: weekStartStr,
              is_recurring: false,
              worker: worker,
              slot: slot
            });
          }
        }
        
        setAssignments(updatedAssignments);
        
        toast({
          title: "בוצע",
          description: "השיבוץ נשמר בהצלחה",
        });
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן לשמור את השיבוץ",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error assigning producer:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת שיבוץ המפיק",
        variant: "destructive"
      });
    } finally {
      setSaving(prev => ({ ...prev, [saveKey]: false }));
    }
  };
  
  const handleRemoveAssignment = async (assignmentId: string) => {
    setSaving(prev => ({ ...prev, [assignmentId]: true }));
    
    try {
      const success = await removeAssignment(assignmentId);
      
      if (success) {
        // Update local state
        setAssignments(assignments.filter(a => a.id !== assignmentId));
        
        toast({
          title: "בוצע",
          description: "השיבוץ הוסר בהצלחה",
        });
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן להסיר את השיבוץ",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת הסרת השיבוץ",
        variant: "destructive"
      });
    } finally {
      setSaving(prev => ({ ...prev, [assignmentId]: false }));
    }
  };
  
  const getAssignmentsForSlot = (slotId: string, role: string): ProducerAssignment[] => {
    return assignments.filter(a => a.slot_id === slotId && a.role === role);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">טוען נתונים...</span>
      </div>
    );
  }
  
  const days = [0, 1, 2, 3, 4, 5, 6];
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const roles = ["מפיק", "עורך", "מתמלל"];
  
  // Get unique show times for columns
  const showTimes = [...new Set(slots.map(slot => slot.start_time))].sort();
  
  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תוכנית</TableHead>
                {days.slice(0, 6).map((day) => (
                  <TableHead key={day}>
                    {dayNames[day]} ({format(addDays(currentWeek, day), 'dd/MM', { locale: he })})
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {showTimes.map((time) => {
                // Get all slots for this time
                const timeSlots = slots.filter(slot => slot.start_time === time);
                
                return (
                  <TableRow key={time}>
                    <TableCell className="font-medium align-middle">
                      {time}
                    </TableCell>
                    
                    {days.slice(0, 6).map((day) => {
                      // Find slots for this day and time
                      const daySlots = timeSlots.filter(slot => slot.day_of_week === day);
                      
                      if (daySlots.length === 0) {
                        return <TableCell key={`day-${day}`} />;
                      }
                      
                      return (
                        <TableCell key={`day-${day}`} className="p-2">
                          {daySlots.map((slot) => (
                            <div key={slot.id} className="mb-4 p-2 border rounded">
                              <div className="font-medium mb-2">
                                {slot.show_name}
                                {slot.host_name && ` (${slot.host_name})`}
                              </div>
                              
                              {roles.map((role) => {
                                const slotAssignments = getAssignmentsForSlot(slot.id, role);
                                const saveKey = `${slot.id}-${day}-${role}`;
                                
                                return (
                                  <div key={`${slot.id}-${role}`} className="mb-2">
                                    <Label className="block mb-1">{role}:</Label>
                                    <div className="flex items-center">
                                      <Select 
                                        onValueChange={(value) => handleAssignProducer(slot.id, day, value, role)}
                                        value={slotAssignments.length > 0 ? slotAssignments[0].worker_id : ""}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="בחר עובד" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">ללא שיבוץ</SelectItem>
                                          {workers.map((worker) => (
                                            <SelectItem key={worker.id} value={worker.id}>
                                              {worker.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      
                                      {saving[saveKey] && (
                                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                      )}
                                      
                                      {slotAssignments.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveAssignment(slotAssignments[0].id)}
                                          disabled={saving[slotAssignments[0].id]}
                                          className="ml-2"
                                        >
                                          {saving[slotAssignments[0].id] ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            "הסר"
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyAssignments;
