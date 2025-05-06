
import React, { useState, useEffect, useCallback } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { useWorkers } from '@/hooks/useWorkers';
import { useFilterWorkersByDivision } from '@/hooks/useWorkerDivisions';
import { format, addDays } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ProducerAssignment,
  ProducerRole,
  createProducerAssignment,
  deleteProducerAssignment,
  getProducerRoles
} from '@/lib/supabase/producers';
import { ScheduleSlot } from '@/types/schedule';
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ currentWeek }) => {
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [roles, setRoles] = useState<ProducerRole[]>([]);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const { workers, loading: allWorkersLoading } = useWorkers();
  const { toast } = useToast();
  
  // Important: Use false for the second parameter to get weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading, error: slotsError } = useScheduleSlots(currentWeek, false);
  
  // Get workers in the producers division (assuming there's a division with this ID)
  const producersDivisionId = '0794299c-45cf-46a7-8ace-c778e4ca599c'; // Replace with actual ID
  const { workerIds, loading: divisionWorkersLoading } = useFilterWorkersByDivision(producersDivisionId);
  
  useEffect(() => {
    if (!allWorkersLoading && !divisionWorkersLoading) {
      if (workerIds.length > 0) {
        // Filter workers based on the workers in the division
        const filtered = workers.filter(worker => workerIds.includes(worker.id));
        setFilteredWorkers(filtered);
      } else {
        // If no division filter is active, use all workers as fallback
        setFilteredWorkers(workers);
      }
      setWorkersLoading(false);
    }
  }, [workers, workerIds, allWorkersLoading, divisionWorkersLoading]);
  
  useEffect(() => {
    loadAssignments();
    loadRoles();
  }, [currentWeek]);
  
  const loadAssignments = useCallback(async () => {
    try {
      // Get assignments data
      // const assignmentsData = await getProducerAssignments(currentWeek);
      
      // setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error loading assignments:", error);
      setAssignments([]);
    }
  }, [currentWeek]);
  
  const loadRoles = useCallback(async () => {
    try {
      const rolesData = await getProducerRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading roles:", error);
      setRoles([]);
    }
  }, []);
  
  const handleSlotSelect = (slot: ScheduleSlot) => {
    setSelectedSlot(slot);
  };
  
  const handleWorkerSelect = (value: string) => {
    setSelectedWorker(value);
  };
  
  const handleRoleSelect = (value: string) => {
    setSelectedRole(value);
  };
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotes(e.target.value);
  };
  
  const handleIsRecurringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsRecurring(e.target.checked);
  };
  
  const handleCreateAssignment = async () => {
    if (!selectedSlot) {
      toast({
        title: "שגיאה",
        description: "יש לבחור משבצת שידור",
        variant: "destructive",
      });
      return;
    }
    if (!selectedWorker) {
      toast({
        title: "שגיאה",
        description: "יש לבחור עובד",
        variant: "destructive",
      });
      return;
    }
    if (!selectedRole) {
      toast({
        title: "שגיאה",
        description: "יש לבחור תפקיד",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const assignmentData = {
        slot_id: selectedSlot.id,
        worker_id: selectedWorker,
        role: selectedRole,
        week_start: format(currentWeek, 'yyyy-MM-dd'),
        is_recurring: isRecurring,
        notes: notes
      };
      
      const newAssignment = await createProducerAssignment(assignmentData);
      
      if (newAssignment) {
        toast({
          title: "הצלחה",
          description: "השיבוץ נוצר בהצלחה",
        });
        loadAssignments();
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה ביצירת השיבוץ",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת השיבוץ",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את השיבוץ?')) {
      try {
        const success = await deleteProducerAssignment(assignmentId);
        if (success) {
          toast({
            title: "הצלחה",
            description: "השיבוץ נמחק בהצלחה",
          });
          loadAssignments();
        } else {
          toast({
            title: "שגיאה",
            description: "אירעה שגיאה במחיקת השיבוץ",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting assignment:", error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת השיבוץ",
          variant: "destructive",
        });
      }
    }
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  const renderWorkerOptions = () => {
    if (workersLoading) {
      return [<SelectItem key="loading" value="">טוען עובדים...</SelectItem>];
    }
    
    return [
      <SelectItem key="default" value="">בחר עובד</SelectItem>,
      ...filteredWorkers.map(worker => (
        <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
      ))
    ];
  };
  
  const renderRoleOptions = () => {
    return [
      <SelectItem key="default" value="">בחר תפקיד</SelectItem>,
      ...roles.map(role => (
        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
      ))
    ];
  };
  
  if (slotsLoading) {
    return <div className="text-center py-4">טוען משבצות שידור...</div>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
      <div className="md:col-span-1">
        <h3 className="text-lg font-medium">משבצות שידור</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>יום</TableHead>
              <TableHead>שעה</TableHead>
              <TableHead>תוכנית</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scheduleSlots.map((slot) => (
              <TableRow
                key={slot.id}
                onClick={() => handleSlotSelect(slot)}
                className={`cursor-pointer hover:bg-gray-100 ${selectedSlot?.id === slot.id ? 'bg-gray-200' : ''}`}
              >
                <TableCell>{dayNames[slot.day_of_week]}</TableCell>
                <TableCell>{slot.start_time}</TableCell>
                <TableCell>{slot.show_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="md:col-span-2">
        <h3 className="text-lg font-medium">פרטי שיבוץ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="worker">עובד</Label>
            <Select onValueChange={handleWorkerSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר עובד" />
              </SelectTrigger>
              <SelectContent>
                {renderWorkerOptions()}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="role">תפקיד</Label>
            <Select onValueChange={handleRoleSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר תפקיד" />
              </SelectTrigger>
              <SelectContent>
                {renderRoleOptions()}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4">
          <Label htmlFor="notes">הערות</Label>
          <Input type="text" id="notes" value={notes} onChange={handleNotesChange} />
        </div>
        
        <div className="mt-4 flex items-center">
          <Input type="checkbox" id="isRecurring" checked={isRecurring} onChange={handleIsRecurringChange} className="ml-2" />
          <Label htmlFor="isRecurring">שיבוץ חוזר</Label>
        </div>
        
        <Button onClick={handleCreateAssignment} className="mt-4">
          צור שיבוץ
        </Button>
      </div>
      
      {assignments.length > 0 && (
        <div className="md:col-span-3">
          <h3 className="text-lg font-medium">שיבוצים קיימים</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תוכנית</TableHead>
                <TableHead>עובד</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.slot_id}</TableCell>
                  <TableCell>{assignment.worker_id}</TableCell>
                  <TableCell>{assignment.role}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(assignment.id)}>
                      מחק
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default WeeklyAssignments;
