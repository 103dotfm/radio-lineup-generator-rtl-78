import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Calendar, Trash2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProducerAssignments,
  createProducerAssignment,
  deleteProducerAssignment,
  getProducerRoles,
  ProducerRole,
  ProducerAssignment,
  Worker
} from '@/lib/supabase/producers';
import { ScheduleSlot, fetchScheduleSlots } from '@/lib/supabase/schedule-slots';
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { getWorkersByDivisionId } from '@/lib/supabase/divisions';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
}

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const WeeklyAssignments = ({ currentWeek }: WeeklyAssignmentsProps) => {
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [producerRoles, setProducerRoles] = useState<ProducerRole[]>([]);
  const [producers, setProducers] = useState<Worker[]>([]);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [newAssignments, setNewAssignments] = useState<{
    [slotId: string]: { role: string; worker_id: string | null; notes: string };
  }>({});
  const [loading, setLoading] = useState(true);
  const [assigningRoles, setAssigningRoles] = useState<{ [slotId: string]: boolean }>({});
  const { toast } = useToast();
  
  // Define the producers division ID - replace this with your actual division ID
  const PRODUCERS_DIVISION_ID = '4b221a12-b4e5-4e40-8f44-c38ba85f6d96'; // Replace with your actual Producers division ID

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load slots
        const slots = await fetchScheduleSlots();
        setScheduleSlots(slots);
        
        // Load producer roles
        const roles = await getProducerRoles();
        setProducerRoles(roles);
        
        // Load workers specifically from the producers division
        const producersWorkers = await getWorkersByDivisionId(PRODUCERS_DIVISION_ID);
        setProducers(producersWorkers);
        
        // Load assignments for the current week
        await loadAssignments();
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בטעינת הנתונים",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentWeek, toast]);
  
  const loadAssignments = async () => {
    try {
      const assignmentsData = await getProducerAssignments(currentWeek);
      setAssignments(assignmentsData);
      
      // Pre-populate assignments into schedule slots
      const updatedSlots = scheduleSlots.map(slot => ({
        ...slot,
        assignments: assignmentsData.filter(assignment => assignment.slot_id === slot.id)
      }));
      setScheduleSlots(updatedSlots);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת מטלות",
        variant: "destructive",
      });
    }
  };
  
  const handleRoleChange = (slotId: string, role: string) => {
    setNewAssignments(prev => ({
      ...prev,
      [slotId]: { ...prev[slotId], role }
    }));
  };
  
  const handleWorkerChange = (slotId: string, worker_id: string | null, notes: string) => {
    setNewAssignments(prev => ({
      ...prev,
      [slotId]: { ...prev[slotId], worker_id, notes }
    }));
  };
  
  const handleAddAssignment = async (slotId: string) => {
    setAssigningRoles(prev => ({ ...prev, [slotId]: true }));
    
    try {
      if (!newAssignments[slotId]?.role || !newAssignments[slotId]?.worker_id) {
        throw new Error("תפקיד ועובד נדרשים");
      }
      
      const weekStart = format(currentWeek, 'yyyy-MM-dd');
      
      const newAssignment = {
        slot_id: slotId,
        worker_id: newAssignments[slotId].worker_id,
        role: newAssignments[slotId].role,
        week_start: weekStart,
        notes: newAssignments[slotId].notes,
        is_recurring: false
      };
      
      await createProducerAssignment(newAssignment);
      
      // Refresh assignments after adding
      await loadAssignments();
      
      // Clear the new assignment for this slot
      setNewAssignments(prev => {
        const { [slotId]: removedAssignment, ...rest } = prev;
        return rest;
      });
      
      toast({
        title: "הצלחה",
        description: "התפקיד נוסף בהצלחה",
      });
    } catch (error: any) {
      console.error("Error adding assignment:", error);
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בהוספת התפקיד",
        variant: "destructive",
      });
    } finally {
      setAssigningRoles(prev => ({ ...prev, [slotId]: false }));
    }
  };
  
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את התפקיד הזה?")) {
      try {
        await deleteProducerAssignment(assignmentId);
        
        // Refresh assignments after deleting
        await loadAssignments();
        
        toast({
          title: "הצלחה",
          description: "התפקיד נמחק בהצלחה",
        });
      } catch (error) {
        console.error("Error deleting assignment:", error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת התפקיד",
          variant: "destructive",
        });
      }
    }
  };

  // In the RoleSelect component, make sure the Select.Item has a non-empty value
  const RoleSelect = ({ value, onChange, disabled }: RoleSelectProps) => {
    return (
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="בחר תפקיד" />
        </SelectTrigger>
        <SelectContent dir="rtl" className="bg-background">
          {producerRoles.length > 0 ? (
            producerRoles.map((role) => (
              <SelectItem key={role.id} value={role.name || "default-role"}>
                {role.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="loading">טוען תפקידים...</SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  };
  
  const renderSlot = (slot: ScheduleSlot) => {
    return (
      <div key={slot.id} className="border rounded-lg p-4 mb-4 bg-background">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{slot.show_name}</h3>
            <span className="text-sm text-muted-foreground">
              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {slot.assignments && Array.isArray(slot.assignments) && slot.assignments.map((assignment) => (
              <div key={assignment.id} className="border rounded p-3 relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{assignment.role}</div>
                    {assignment.worker && (
                      <div className="text-sm">{assignment.worker.name}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground mb-2">
                  {assignment.notes}
                </div>
              </div>
            ))}
            
            <div className="border border-dashed rounded p-3 flex flex-col">
              <div className="text-center text-muted-foreground mb-2">הוספת תפקיד</div>
              <div className="space-y-2">
                <RoleSelect
                  value={newAssignments[slot.id]?.role || ""}
                  onChange={(value) => handleRoleChange(slot.id, value)}
                  disabled={assigningRoles[slot.id]}
                />
                <WorkerSelector
                  value={newAssignments[slot.id]?.worker_id || null}
                  onChange={(value, additionalText) => handleWorkerChange(slot.id, value, additionalText || "")}
                  additionalText={newAssignments[slot.id]?.notes || ""}
                  placeholder="בחר עובד..."
                  workers={producers}
                />
                <Button
                  className="w-full"
                  disabled={
                    !newAssignments[slot.id]?.role ||
                    !newAssignments[slot.id]?.worker_id ||
                    assigningRoles[slot.id]
                  }
                  onClick={() => handleAddAssignment(slot.id)}
                >
                  {assigningRoles[slot.id] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      מוסיף...
                    </>
                  ) : (
                    "הוסף"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return <div>טוען נתונים...</div>;
  }
  
  return (
    <div className="space-y-4">
      {scheduleSlots.map(slot => renderSlot(slot))}
    </div>
  );
};

export default WeeklyAssignments;
