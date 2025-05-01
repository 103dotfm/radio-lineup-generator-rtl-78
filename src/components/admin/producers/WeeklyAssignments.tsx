
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  createProducerAssignment,
  createRecurringProducerAssignment,
  deleteProducerAssignment,
  getProducerAssignments,
  getProducerRoles,
  getProducers 
} from '@/lib/supabase/producers';
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';
import { Label } from '@/components/ui/label';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ currentWeek }) => {
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(currentWeek, true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<any>(null);
  const [formData, setFormData] = useState({
    workerId: '',
    role: '',
    isRecurring: false
  });
  
  const { toast } = useToast();
  
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
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני הסידור",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Group slots by day
  const slotsByDay: { [key: number]: any[] } = scheduleSlots.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(slot);
    return acc;
  }, {} as { [key: number]: any[] });
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string) => {
    return assignments.filter(assignment => assignment.slot_id === slotId);
  };
  
  const handleAssignProducer = (slot: any) => {
    setCurrentSlot(slot);
    setFormData({
      workerId: '',
      role: roles.length > 0 ? roles[0].id : '',
      isRecurring: false
    });
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async () => {
    if (!formData.workerId || !formData.role || !currentSlot) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const selectedRole = roles.find(r => r.id === formData.role);
      
      if (formData.isRecurring) {
        // Create assignments for all matching slots
        const success = await createRecurringProducerAssignment(
          currentSlot.id,
          formData.workerId,
          selectedRole ? selectedRole.name : '',
          format(currentWeek, 'yyyy-MM-dd')
        );
        
        if (success) {
          toast({
            title: "נוסף בהצלחה",
            description: "העובד נוסף לכל התוכניות המתאימות בסידור העבודה בהצלחה"
          });
          loadData(); // Refresh the assignments
          setIsDialogOpen(false);
        } else {
          toast({
            title: "שגיאה",
            description: "לא נמצאו תוכניות מתאימות בסידור העבודה",
            variant: "destructive"
          });
        }
      } else {
        // Create a single assignment
        const assignment = {
          slot_id: currentSlot.id,
          worker_id: formData.workerId,
          role: selectedRole ? selectedRole.name : '',
          week_start: format(currentWeek, 'yyyy-MM-dd'),
          is_recurring: false
        };
        
        const result = await createProducerAssignment(assignment);
        if (result) {
          toast({
            title: "נוסף בהצלחה",
            description: "העובד נוסף לסידור העבודה בהצלחה"
          });
          loadData(); // Refresh the assignments
          setIsDialogOpen(false);
        } else {
          toast({
            title: "שגיאה",
            description: "לא ניתן להוסיף את העובד לסידור. יתכן כי התוכנית אינה קיימת.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error assigning producer:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהוספת העובד לסידור",
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
          loadData(); // Refresh the assignments
        } else {
          throw new Error("Failed to delete assignment");
        }
      } catch (error) {
        console.error("Error deleting assignment:", error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת השיבוץ",
          variant: "destructive"
        });
      }
    }
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  if (isLoading || slotsLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">סידור שבועי</h3>
      
      {dayNames.map((dayName, dayIndex) => {
        const daySlotsData = slotsByDay[dayIndex] || [];
        if (daySlotsData.length === 0) return null;
        
        return (
          <Card key={dayIndex} className="mb-4">
            <div className="bg-slate-100 p-2 font-bold border-b">
              {dayName} - {format(addDays(currentWeek, dayIndex), 'dd/MM/yyyy', { locale: he })}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שעות</TableHead>
                  <TableHead>שם התוכנית</TableHead>
                  <TableHead>עריכה</TableHead>
                  <TableHead>הפקה</TableHead>
                  <TableHead className="text-left">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daySlotsData
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(slot => {
                    const slotAssignments = getAssignmentsForSlot(slot.id);
                    
                    // Group assignments by role
                    const editingAssignments = slotAssignments.filter(a => a.role === "עריכה");
                    const producingAssignments = slotAssignments.filter(a => a.role === "הפקה");
                    
                    return (
                      <TableRow key={slot.id}>
                        <TableCell className="whitespace-nowrap">
                          {slot.start_time} - {slot.end_time}
                        </TableCell>
                        <TableCell>
                          {slot.show_name}
                          {slot.host_name && <div className="text-sm text-muted-foreground">{slot.host_name}</div>}
                        </TableCell>
                        <TableCell>
                          {editingAssignments.length > 0 ? (
                            <div className="space-y-1">
                              {editingAssignments.map(assignment => (
                                <div key={assignment.id} className="flex justify-between items-center bg-slate-50 p-1 rounded text-sm">
                                  <span className="font-medium">{assignment.worker?.name}</span>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteAssignment(assignment.id)}>
                                    ✕
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">לא משובץ</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {producingAssignments.length > 0 ? (
                            <div className="space-y-1">
                              {producingAssignments.map(assignment => (
                                <div key={assignment.id} className="flex justify-between items-center bg-slate-50 p-1 rounded text-sm">
                                  <span className="font-medium">{assignment.worker?.name}</span>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteAssignment(assignment.id)}>
                                    ✕
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">לא משובץ</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleAssignProducer(slot)}>
                            הוסף עובד
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
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת עובד לתוכנית</DialogTitle>
            <DialogDescription>
              שבץ עובד לתפקיד בתוכנית. ניתן לבחור האם לשבץ לכל התוכניות המתאימות.
            </DialogDescription>
          </DialogHeader>
          {currentSlot && (
            <div className="space-y-4 py-4">
              <div>
                <p className="font-medium">{currentSlot.show_name}</p>
                <p className="text-sm text-muted-foreground">
                  {dayNames[currentSlot.day_of_week]} {format(addDays(currentWeek, currentSlot.day_of_week), 'dd/MM/yyyy', { locale: he })}, {currentSlot.start_time} - {currentSlot.end_time}
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="worker">בחר עובד:</label>
                <Select value={formData.workerId} onValueChange={(value) => setFormData({ ...formData, workerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר עובד" />
                  </SelectTrigger>
                  <SelectContent>
                    {producers.map(producer => (
                      <SelectItem key={producer.id} value={producer.id}>
                        {producer.name} {producer.position && `(${producer.position})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="role">בחר תפקיד:</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תפקיד" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch 
                  id="recurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                />
                <Label htmlFor="recurring" className="mr-2">
                  שבץ לכל התוכניות המתאימות (יום, שעה, שם)
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSubmit}>הוסף לסידור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAssignments;
