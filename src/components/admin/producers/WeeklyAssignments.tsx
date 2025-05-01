
import React, { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';
import { ScheduleSlot } from '@/types/schedule';
import { 
  getProducerAssignments, 
  getProducers, 
  getProducerRoles, 
  createProducerAssignment, 
  deleteProducerAssignment,
  ProducerAssignment,
  ProducerRole
} from '@/lib/supabase/producers';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ currentWeek }) => {
  const { toast } = useToast();
  const { slots: scheduleSlots, loading: slotsLoading, error: slotsError } = useScheduleSlots(currentWeek);
  
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [roles, setRoles] = useState<ProducerRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  useEffect(() => {
    loadData();
  }, [currentWeek]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, producersData, rolesData] = await Promise.all([
        getProducerAssignments(currentWeek),
        getProducers(),
        getProducerRoles()
      ]);
      
      setAssignments(assignmentsData);
      setProducers(producersData);
      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading assignments data:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני משבצות",
        variant: "destructive"
      });
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
  
  const handleOpenAssignDialog = (slot: ScheduleSlot) => {
    setSelectedSlot(slot);
    setSelectedProducer("");
    setSelectedRole("");
    setDialogOpen(true);
  };
  
  const handleAssignProducer = async () => {
    if (!selectedSlot || !selectedProducer || !selectedRole) {
      toast({
        title: "שגיאה",
        description: "יש לבחור עובד ותפקיד",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const newAssignment = await createProducerAssignment({
        slot_id: selectedSlot.id,
        worker_id: selectedProducer,
        role: selectedRole,
        week_start: format(currentWeek, 'yyyy-MM-dd'),
        is_recurring: false
      });
      
      if (newAssignment) {
        toast({
          title: "השיבוץ בוצע בהצלחה",
          description: "עובד שובץ בהצלחה למשבצת"
        });
        
        // Reload assignments
        loadData();
        setDialogOpen(false);
      } else {
        throw new Error("Failed to create assignment");
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשיבוץ עובד למשבצת",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את השיבוץ?')) {
      try {
        const success = await deleteProducerAssignment(assignmentId);
        if (success) {
          toast({
            title: "נמחק בהצלחה",
            description: "השיבוץ נמחק בהצלחה"
          });
          loadData();
        } else {
          throw new Error("Failed to delete assignment");
        }
      } catch (error) {
        console.error('Error deleting assignment:', error);
        toast({
          title: "שגיאה",
          description: "שגיאה במחיקת השיבוץ",
          variant: "destructive"
        });
      }
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">שיבוץ שבועי</h3>
      
      {isLoading || slotsLoading ? (
        <div className="text-center py-4">טוען...</div>
      ) : slotsError ? (
        <div className="text-center py-4 text-red-500">שגיאה בטעינת נתוני משבצות</div>
      ) : (
        <>
          {dayNames.map((dayName, dayIndex) => {
            const daySlotsData = slotsByDay[dayIndex] || [];
            if (daySlotsData.length === 0) return null;
            
            return (
              <Card key={dayIndex} className="mb-6">
                <div className="bg-slate-100 p-3 font-bold border-b">
                  {dayName} - {format(addDays(currentWeek, dayIndex), 'dd/MM/yyyy', { locale: he })}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שעות</TableHead>
                      <TableHead>שם התוכנית</TableHead>
                      <TableHead>שיבוצים</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daySlotsData
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((slot) => {
                        const slotAssignments = getAssignmentsForSlot(slot.id);
                        
                        return (
                          <TableRow key={slot.id}>
                            <TableCell>
                              {slot.start_time} - {slot.end_time}
                            </TableCell>
                            <TableCell>{slot.show_name}</TableCell>
                            <TableCell>
                              {slotAssignments.length > 0 ? (
                                <div className="space-y-1">
                                  {slotAssignments.map((assignment) => (
                                    <div key={assignment.id} className="flex justify-between items-center text-sm border-b pb-1">
                                      <span className="font-medium">{assignment.worker?.name}</span>
                                      <div className="flex items-center">
                                        <span className="text-gray-600 ms-2">{assignment.role}</span>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0" 
                                          onClick={() => handleDeleteAssignment(assignment.id)}
                                        >
                                          <XCircle className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">אין שיבוצים</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenAssignDialog(slot)}
                              >
                                שבץ עובד
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  שיבוץ עובד למשבצת
                  {selectedSlot && (
                    <div className="text-sm font-normal mt-1">
                      {dayNames[selectedSlot.day_of_week]}, {selectedSlot.start_time} - {selectedSlot.end_time}, {selectedSlot.show_name}
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="producer">בחר עובד:</label>
                  <Select
                    value={selectedProducer}
                    onValueChange={setSelectedProducer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר עובד" />
                    </SelectTrigger>
                    <SelectContent>
                      {producers.map((producer) => (
                        <SelectItem key={producer.id} value={producer.id}>
                          {producer.name} {producer.position ? `(${producer.position})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="role">בחר תפקיד:</label>
                  <Select
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAssignProducer}>שבץ עובד</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default WeeklyAssignments;
