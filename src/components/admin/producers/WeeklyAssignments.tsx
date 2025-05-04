import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
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
  getProducers,
  type ProducerAssignment
} from '@/lib/supabase/producers';
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';
import { Label } from '@/components/ui/label';
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import { ScheduleSlot } from '@/types/schedule';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ currentWeek }) => {
  // Important: use false for isMasterSchedule to get the weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(currentWeek, false);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<ScheduleSlot | null>(null);
  const [formData, setFormData] = useState({
    workerId: '',
    role: '',
    isWeekdays: false,
    isPermanent: false
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
      
      setAssignments(assignmentsData || []);
      setProducers(producersData || []);
      setRoles(rolesData || []);
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
  
  // Group slots by day and time for a more organized display
  const slotsByDayAndTime: { [key: string]: ScheduleSlot[] } = {};
  
  // Create a map of unique slots to prevent duplicates
  const uniqueSlotsMap: { [key: string]: boolean } = {};
  
  scheduleSlots.forEach(slot => {
    const day = slot.day_of_week;
    const time = slot.start_time;
    const key = `${day}-${time}`;
    const uniqueKey = `${day}-${time}-${slot.show_name}-${slot.host_name}`;
    
    // Only process this slot if we haven't seen a duplicate already
    if (!uniqueSlotsMap[uniqueKey]) {
      uniqueSlotsMap[uniqueKey] = true;
      
      if (!slotsByDayAndTime[key]) {
        slotsByDayAndTime[key] = [];
      }
      slotsByDayAndTime[key].push(slot);
    }
  });
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string): ProducerAssignment[] => {
    return assignments.filter((assignment) => assignment.slot_id === slotId);
  };
  
  const handleAssignProducer = (slot: ScheduleSlot) => {
    setCurrentSlot(slot);
    setFormData({
      workerId: '',
      role: roles.length > 0 ? roles[0].id : '',
      isWeekdays: false,
      isPermanent: false
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
      const roleName = selectedRole ? selectedRole.name : '';
      
      // Check if we're creating a permanent assignment
      if (formData.isPermanent) {
        console.log("Creating permanent assignment for slot:", currentSlot);
        try {
          const success = await createRecurringProducerAssignment(
            currentSlot.id,
            formData.workerId,
            roleName,
            format(currentWeek, 'yyyy-MM-dd')
          );
          
          if (success) {
            toast({
              title: "נוסף בהצלחה",
              description: "העובד נוסף לסידור העבודה הקבוע בהצלחה"
            });
            await loadData(); // Refresh the assignments
            // Don't close dialog, allow adding more producers
            // Reset producer selection for next addition
            setFormData({
              ...formData,
              workerId: ''
            });
        } else {
          toast({
            title: "שגיאה",
            description: "לא ניתן להוסיף את העובד לסידור הקבוע",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error("Error creating permanent assignment:", error);
        toast({
          title: "שגיאה",
          description: error.message || "לא ניתן להוסיף את העובד לסידור הקבוע",
          variant: "destructive"
        });
      }
    } 
    // Check if we're creating assignments for all weekdays
    else if (formData.isWeekdays) {
      console.log("Creating assignments for all weekdays with slot:", currentSlot);
      
      let successCount = 0;
      let errorCount = 0;
      
      // First create assignment for current slot
      try {
        const currentSlotAssignment = {
          slot_id: currentSlot.id,
          worker_id: formData.workerId,
          role: roleName,
          week_start: format(currentWeek, 'yyyy-MM-dd'),
          is_recurring: false
        };
        
        const result = await createProducerAssignment(currentSlotAssignment);
        if (result) {
          successCount++;
        }
      } catch (error: any) {
        console.error("Error creating assignment for current slot:", error);
        errorCount++;
      }
      
      // Then find all other weekday slots with the same time
      const currentTime = currentSlot.start_time;
      const currentDay = currentSlot.day_of_week;
      
      // Get applicable days (0-3, excluding the current day)
      const applicableDays = [0, 1, 2, 3].filter(day => day !== currentDay);
      
      for (const dayIndex of applicableDays) {
        const key = `${dayIndex}-${currentTime}`;
        const slotsForDay = slotsByDayAndTime[key] || [];
        
        // Check if we have slots for this day and time
        if (slotsForDay.length > 0) {
          for (const slot of slotsForDay) {
            // Make sure slot exists and is valid
            if (!slot || !slot.id) continue;
            
            try {
              const assignment = {
                slot_id: slot.id,
                worker_id: formData.workerId,
                role: roleName,
                week_start: format(currentWeek, 'yyyy-MM-dd'),
                is_recurring: false
              };
              
              console.log(`Creating assignment for day ${dayIndex} slot:`, slot);
              const result = await createProducerAssignment(assignment);
              if (result) {
                successCount++;
              }
            } catch (error: any) {
              console.error(`Error creating assignment for day ${dayIndex} slot:`, error);
              errorCount++;
            }
          }
        } else {
          console.log(`No slots found for day ${dayIndex} at time ${currentTime}`);
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "נוסף בהצלחה",
          description: `העובד נוסף ל-${successCount} משבצות בסידור העבודה`
        });
        await loadData(); // Refresh the assignments
        // Don't close dialog, allow adding more producers
        // Reset producer selection for next addition
        setFormData({
          ...formData,
          workerId: ''
        });
      } else {
        toast({
          title: "מידע",
          description: errorCount > 0 
            ? "אירעו שגיאות בהוספת השיבוצים. בדוק את הלוג לפרטים נוספים." 
            : "לא נמצאו תוכניות נוספות לשיבוץ או שכל השיבוצים כבר קיימים"
        });
      }
    } else {
      // Create a single assignment
      try {
        const assignment = {
          slot_id: currentSlot.id,
          worker_id: formData.workerId,
          role: roleName,
          week_start: format(currentWeek, 'yyyy-MM-dd'),
          is_recurring: false
        };
        
        console.log("Creating single assignment for slot:", currentSlot);
        const result = await createProducerAssignment(assignment);
        if (result) {
          toast({
            title: "נוסף בהצלחה",
            description: "העובד נוסף לסידור העבודה בהצלחה"
          });
          await loadData(); // Refresh the assignments
          // Don't close dialog, allow adding more producers
          // Reset producer selection for next addition
          setFormData({
            ...formData,
            workerId: ''
          });
        } else {
          toast({
            title: "מידע",
            description: "שיבוץ זה כבר קיים או שלא ניתן להוסיף את העובד"
          });
        }
      } catch (error: any) {
        console.error("Error creating producer assignment:", error);
        toast({
          title: "שגיאה",
          description: error.message || "שגיאה ביצירת שיבוץ חדש",
          variant: "destructive"
        });
      }
    }
  } catch (error: any) {
    console.error("Error assigning producer:", error);
    toast({
      title: "שגיאה",
      description: error.message || "אירעה שגיאה בהוספת העובד לסידור",
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
          await loadData(); // Refresh the assignments
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
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  // Sort timeslots to display them in chronological order
  const timeslots = [...new Set(scheduleSlots.map(slot => slot.start_time))].sort();
  
  if (isLoading || slotsLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }
  
  // Filter out producers that are already assigned with this role to this slot
  const getAvailableProducers = () => {
    if (!currentSlot) return producers;
    
    const existingAssignments = assignments.filter(
      assignment => assignment.slot_id === currentSlot.id
    );
    
    // Get producers who are already assigned with the selected role
    const producersWithSelectedRole = existingAssignments
      .filter(assignment => {
        const selectedRole = roles.find(r => r.id === formData.role);
        return assignment.role === (selectedRole ? selectedRole.name : '');
      })
      .map(assignment => assignment.worker_id);
    
    // Return producers who aren't already assigned with this role
    return producers.filter(producer => !producersWithSelectedRole.includes(producer.id));
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">סידור שבועי</h3>
      
      <Card className="mb-4">
        <div className="p-2 font-bold border-b bg-slate-100">
          שבוע {format(currentWeek, 'dd/MM/yyyy', { locale: he })} - {format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he })}
        </div>
        <div className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">משבצת</TableHead>
                {/* Order days from right to left (Sunday to Saturday) */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                  <TableHead key={`day-header-${dayIndex}`} className="text-center min-w-[150px]">
                    {dayNames[dayIndex]}
                    <div className="text-xs font-normal">
                      {format(addDays(currentWeek, dayIndex), 'dd/MM', { locale: he })}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeslots.map((time, timeIndex) => (
                <TableRow key={`time-row-${time}-${timeIndex}`}>
                  <TableCell className="font-medium">{time}</TableCell>
                  {/* Days in RTL order (Sunday to Saturday) */}
                  {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                    const key = `${dayIndex}-${time}`;
                    const slotsForCell = slotsByDayAndTime[key] || [];
                    
                    return (
                      <TableCell 
                        key={`cell-${dayIndex}-${time}-${timeIndex}`} 
                        className="p-2 align-top cursor-pointer hover:bg-gray-50"
                      >
                        {slotsForCell.length > 0 ? (
                          <div>
                            {slotsForCell.map((slot, slotIndex) => {
                              const slotAssignments = getAssignmentsForSlot(slot.id);
                              const combinedShowName = getCombinedShowDisplay(slot.show_name, slot.host_name);
                              
                              return (
                                <div 
                                  key={`slot-${slot.id}-${time}-${slotIndex}`}
                                  className="mb-3 border rounded p-2 bg-gray-50"
                                  onClick={() => handleAssignProducer(slot)}
                                >
                                  <div className="font-medium text-sm">
                                    {combinedShowName}
                                  </div>
                                  
                                  {slotAssignments.length > 0 && (
                                    <div className="mt-2 text-sm border-t pt-2">
                                      {/* Group assignments by role */}
                                      {Object.entries(
                                        slotAssignments.reduce<Record<string, ProducerAssignment[]>>((acc, assignment) => {
                                          const role = assignment.role || 'ללא תפקיד';
                                          if (!acc[role]) acc[role] = [];
                                          acc[role].push(assignment);
                                          return acc;
                                        }, {})
                                      ).map(([role, roleAssignments]) => (
                                        <div key={`role-${role}-${slot.id}`} className="mb-1">
                                          <span className="font-medium">{role}: </span> 
                                          <div className="space-y-1">
                                            {roleAssignments.map((assignment) => (
                                              <div key={`assignment-${assignment.id}`} className="flex justify-between items-center bg-white p-1 rounded">
                                                <span>{assignment.worker?.name}</span>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="h-6 w-6 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteAssignment(assignment.id);
                                                  }}
                                                >
                                                  ✕
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs">
                            אין תוכניות
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת עובד לתוכנית</DialogTitle>
            <DialogDescription>
              שבץ עובד לתפקיד בתוכנית. ניתן לבחור אפשרויות שיבוץ נוספות.
            </DialogDescription>
          </DialogHeader>
          {currentSlot && (
            <div className="space-y-4 py-4">
              <div>
                <p className="font-medium">{getCombinedShowDisplay(currentSlot.show_name, currentSlot.host_name)}</p>
                <p className="text-sm text-muted-foreground">
                  {dayNames[currentSlot.day_of_week]} {format(addDays(currentWeek, currentSlot.day_of_week), 'dd/MM/yyyy', { locale: he })}, {currentSlot.start_time}
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="worker">בחר עובד:</label>
                <Select value={formData.workerId} onValueChange={(value) => setFormData({ ...formData, workerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר עובד" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableProducers().map((producer) => (
                      <SelectItem key={`producer-select-${producer.id}`} value={producer.id}>
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
                    {roles.map((role) => (
                      <SelectItem key={`role-select-${role.id}`} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch 
                    id="weekdays"
                    checked={formData.isWeekdays}
                    onCheckedChange={(checked) => setFormData({ ...formData, isWeekdays: checked, isPermanent: checked ? false : formData.isPermanent })}
                  />
                  <Label htmlFor="weekdays" className="mr-2">
                    שיבוץ כל השבוע (ראשון-רביעי)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch 
                    id="permanent"
                    checked={formData.isPermanent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPermanent: checked, isWeekdays: checked ? false : formData.isWeekdays })}
                  />
                  <Label htmlFor="permanent" className="mr-2">
                    צוות תוכנית קבוע
                  </Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleCloseDialog}>סגור</Button>
            <Button onClick={handleSubmit} disabled={!formData.workerId || !formData.role}>הוסף לסידור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAssignments;
