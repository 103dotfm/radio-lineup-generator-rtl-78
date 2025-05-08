
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
import { Plus } from 'lucide-react';
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
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { DaySelector } from '@/components/schedule/ui/DaySelector';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
  onAssignmentChange?: () => void;
  refreshTrigger?: number;
}

interface ProducerFormItem {
  workerId: string;
  role: string;
  additionalText?: string;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ 
  currentWeek, 
  onAssignmentChange,
  refreshTrigger = 0
}) => {
  // Important: use false for isMasterSchedule to get the weekly schedule instead of master
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(currentWeek, false);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<ScheduleSlot | null>(null);
  
  // Multi-producer form state - start with just 2 visible
  const [producerForms, setProducerForms] = useState<ProducerFormItem[]>([
    { workerId: '', role: '483bd320-9935-4184-bad7-43255fbe0691', additionalText: '' }, // Default to עריכה
    { workerId: '', role: '348cf89d-0a9b-4c2c-bb33-8b2edee4c612', additionalText: '' }, // Default to הפקה
  ]);
  
  // Track how many worker forms are visible (initially 2)
  const [visibleWorkerCount, setVisibleWorkerCount] = useState(2);
  
  // Selected weekdays for assignment (Sunday-0, Monday-1, Tuesday-2, Wednesday-3)
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isPermanent, setIsPermanent] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    console.log(`WeeklyAssignments: Loading data for week ${currentWeek.toISOString()}`);
    loadData();
  }, [currentWeek, refreshTrigger]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use a consistent date format for the week start
      const weekStartDate = new Date(currentWeek);
      console.log("WeeklyAssignments: Loading data for week", weekStartDate.toISOString());
      
      const [assignmentsData, producersData, rolesData] = await Promise.all([
        getProducerAssignments(weekStartDate),
        getProducers(),
        getProducerRoles()
      ]);
      
      console.log("WeeklyAssignments: Loaded assignments:", assignmentsData);
      console.log("WeeklyAssignments: Loaded producers:", producersData);
      console.log("WeeklyAssignments: Loaded roles:", rolesData);
      
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
  
  // Add another worker form field (show more)
  const addWorkerForm = () => {
    if (visibleWorkerCount < 4) {
      setVisibleWorkerCount(prev => prev + 1);
    }
  };
  
  const handleAssignProducer = (slot: ScheduleSlot) => {
    setCurrentSlot(slot);
    
    // Reset form when opening dialog
    const newProducerForms = [
      { workerId: '', role: '483bd320-9935-4184-bad7-43255fbe0691', additionalText: '' }, // Default to עריכה
      { workerId: '', role: '348cf89d-0a9b-4c2c-bb33-8b2edee4c612', additionalText: '' }, // Default to הפקה
      { workerId: '', role: '483bd320-9935-4184-bad7-43255fbe0691', additionalText: '' }, // Default to עריכה
      { workerId: '', role: '348cf89d-0a9b-4c2c-bb33-8b2edee4c612', additionalText: '' }, // Default to הפקה
    ];
    
    setProducerForms(newProducerForms);
    setVisibleWorkerCount(2); // Start with 2 visible
    setSelectedDays([]);
    setIsPermanent(false);
    
    setIsDialogOpen(true);
  };
  
  const updateProducerForm = (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => {
    setProducerForms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Toggle day selection
  const toggleDay = (dayId: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayId)) {
        return prev.filter(id => id !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  // Handle weekday selection (toggling all weekdays Sunday-Wednesday)
  const handleToggleWeekdays = (checked: boolean) => {
    if (checked) {
      // Select all weekdays (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday)
      setSelectedDays([0, 1, 2, 3]);
    } else {
      // Clear selection
      setSelectedDays([]);
    }
  };
  
  const handleSubmit = async () => {
    if (!currentSlot) {
      toast({
        title: "שגיאה",
        description: "לא נמצאה תוכנית",
        variant: "destructive"
      });
      return;
    }
    
    // Only use visible worker forms, then filter out empty rows
    const visibleForms = producerForms.slice(0, visibleWorkerCount);
    const validForms = visibleForms.filter(form => form.workerId && form.role);
    
    if (validForms.length === 0) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות מפיק אחד",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let successCount = 0;
      
      for (const form of validForms) {
        const selectedRole = roles.find(r => r.id === form.role);
        const roleName = selectedRole ? selectedRole.name : '';
        
        // Check if we're creating a permanent assignment
        if (isPermanent) {
          console.log(`Creating permanent assignment for worker ${form.workerId} with role ${roleName}`);
          try {
            const success = await createRecurringProducerAssignment(
              currentSlot.id,
              form.workerId,
              roleName,
              format(currentWeek, 'yyyy-MM-dd')
            );
            
            if (success) {
              successCount++;
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
        // Check if we're creating assignments for multiple selected days
        else if (selectedDays.length > 0) {
          console.log(`Creating assignments for selected days: ${selectedDays.join(', ')} for worker ${form.workerId} with role ${roleName}`);
          
          // First create assignment for current slot
          try {
            const currentSlotAssignment = {
              slot_id: currentSlot.id,
              worker_id: form.workerId,
              role: roleName,
              week_start: format(currentWeek, 'yyyy-MM-dd'),
              is_recurring: false,
              notes: form.additionalText || undefined
            };
            
            const result = await createProducerAssignment(currentSlotAssignment);
            if (result) {
              successCount++;
            }
          } catch (error: any) {
            console.error("Error creating assignment for current slot:", error);
          }
          
          // Then find all other selected days slots with the same time
          const currentTime = currentSlot.start_time;
          const currentDay = currentSlot.day_of_week;
          
          // Get applicable days from selected days (excluding the current day)
          const applicableDays = selectedDays.filter(day => day !== currentDay);
          
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
                    worker_id: form.workerId,
                    role: roleName,
                    week_start: format(currentWeek, 'yyyy-MM-dd'),
                    is_recurring: false,
                    notes: form.additionalText || undefined
                  };
                  
                  console.log(`Creating assignment for day ${dayIndex} slot for worker ${form.workerId}`);
                  const result = await createProducerAssignment(assignment);
                  if (result) {
                    successCount++;
                  }
                } catch (error: any) {
                  console.error(`Error creating assignment for day ${dayIndex} slot:`, error);
                }
              }
            }
          }
        } else {
          // Create a single assignment
          try {
            // Create date string in yyyy-MM-dd format consistently
            const weekStartDate = new Date(currentWeek);
            const formattedWeekStart = weekStartDate.toISOString().split('T')[0];
            console.log(`Using week start date: ${formattedWeekStart} for assignment`);
            
            const assignment = {
              slot_id: currentSlot.id,
              worker_id: form.workerId,
              role: roleName,
              week_start: formattedWeekStart,
              is_recurring: false,
              notes: form.additionalText || undefined
            };
            
            console.log(`Creating single assignment for worker ${form.workerId} with role ${roleName}`);
            const result = await createProducerAssignment(assignment);
            if (result) {
              successCount++;
            }
          } catch (error: any) {
            console.error("Error creating producer assignment:", error);
          }
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "נוסף בהצלחה",
          description: `נוספו ${successCount} שיבוצים לסידור העבודה`
        });
        await loadData(); // Refresh the assignments immediately
        if (onAssignmentChange) {
          console.log("Notifying parent component about assignment change");
          onAssignmentChange(); // Notify parent component
        }
        setIsDialogOpen(false);
      } else {
        toast({
          title: "מידע",
          description: "לא נוספו שיבוצים חדשים. ייתכן שהם כבר קיימים במערכת."
        });
      }
    } catch (error: any) {
      console.error("Error assigning producers:", error);
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בהוספת העובדים לסידור",
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
          await loadData(); // Refresh the assignments immediately
          if (onAssignmentChange) {
            onAssignmentChange(); // Notify parent component
          }
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>הוספת עובדים לתוכנית</DialogTitle>
            <DialogDescription>
              שבץ עובדים לתפקידים שונים בתוכנית
            </DialogDescription>
          </DialogHeader>
          {currentSlot && (
            <div className="space-y-6 py-4">
              <div>
                <p className="font-medium">{getCombinedShowDisplay(currentSlot.show_name, currentSlot.host_name)}</p>
                <p className="text-sm text-muted-foreground">
                  {dayNames[currentSlot.day_of_week]} {format(addDays(currentWeek, currentSlot.day_of_week), 'dd/MM/yyyy', { locale: he })}, {currentSlot.start_time}
                </p>
              </div>
              
              <div className="border rounded-md p-3 bg-slate-50">
                {/* Show only visible worker forms */}
                {producerForms.slice(0, visibleWorkerCount).map((form, index) => (
                  <div key={`producer-form-${index}`} className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <Label htmlFor={`worker-${index}`} className="mb-2 block">עובד {index + 1}</Label>
                      <div style={{ zIndex: 9990 - index }}>  {/* Higher z-index for worker selectors */}
                        <WorkerSelector
                          value={form.workerId}
                          onChange={(value, additionalText) => {
                            updateProducerForm(index, 'workerId', value || '');
                            if (additionalText) {
                              updateProducerForm(index, 'additionalText', additionalText);
                            }
                          }}
                          additionalText={form.additionalText}
                          placeholder="בחר עובד"
                          className="w-full mb-4"
                          department="מפיקים"
                        />
                      </div>
                    </div>
                    <div className="pt-9">
                      <Select 
                        value={form.role} 
                        onValueChange={(value) => updateProducerForm(index, 'role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר תפקיד" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={`role-select-${role.id}-${index}`} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                {/* Show "Add Worker" button only if fewer than 4 workers are visible */}
                {visibleWorkerCount < 4 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={addWorkerForm}
                  >
                    <Plus className="h-4 w-4 mr-2" /> הוספת עובד
                  </Button>
                )}
              </div>
              
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center space-x-2 space-x-reverse mt-4">
                  <Switch 
                    id="weekdays"
                    checked={selectedDays.length === 4 && [0,1,2,3].every(day => selectedDays.includes(day))}
                    onCheckedChange={handleToggleWeekdays}
                    disabled={isPermanent}
                  />
                  <Label htmlFor="weekdays" className="mr-2">
                    שיבוץ כל השבוע (ראשון-רביעי)
                  </Label>
                </div>
                
                <div className="mt-4">
                  <Label>בחר ימים לשיבוץ</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[0, 1, 2, 3].map(day => (
                      <Button
                        key={`day-toggle-${day}`}
                        type="button"
                        variant={selectedDays.includes(day) ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => toggleDay(day)}
                        disabled={isPermanent}
                      >
                        {dayNames[day]}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse mt-4">
                  <Switch 
                    id="permanent"
                    checked={isPermanent}
                    onCheckedChange={(checked) => {
                      setIsPermanent(checked);
                      if (checked) setSelectedDays([]);
                    }}
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
            <Button 
              onClick={handleSubmit} 
              disabled={!producerForms.slice(0, visibleWorkerCount).some(form => form.workerId && form.role)}
            >
              הוסף לסידור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAssignments;
