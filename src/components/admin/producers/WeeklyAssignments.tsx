
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

const EDITING_ROLE_ID = '483bd320-9935-4184-bad7-43255fbe0691'; // עריכה
const PRODUCTION_ROLE_ID = '348cf89d-0a9b-4c2c-bb33-8b2edee4c612'; // הפקה

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
  
  // Only show 2 producers by default, with option to add more
  const [producerForms, setProducerForms] = useState<ProducerFormItem[]>([
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, // Default to עריכה
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, // Default to הפקה
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, 
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, 
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
    
    // Get existing assignments for this slot
    const slotAssignments = getAssignmentsForSlot(slot.id);
    
    // Reset form when opening dialog - showing only 2 workers initially
    const newProducerForms = [
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, // Default to עריכה
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, // Default to הפקה
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, 
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, 
    ];
    
    // Pre-populate the form with existing assignments
    if (slotAssignments.length > 0) {
      slotAssignments.forEach((assignment, index) => {
        // Only pre-populate up to 4 assignments
        if (index < 4) {
          const roleId = roles.find(r => r.name === assignment.role)?.id || EDITING_ROLE_ID;
          newProducerForms[index] = {
            workerId: assignment.worker_id,
            role: roleId,
            additionalText: assignment.notes || ''
          };
        }
      });
      
      // Set visible workers count to at least include all existing assignments 
      // (up to maximum of 4)
      setVisibleWorkerCount(Math.max(2, Math.min(4, slotAssignments.length)));
    } else {
      setVisibleWorkerCount(2); // Start with 2 visible if no existing assignments
    }
    
    setProducerForms(newProducerForms);
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

  // Fixed: Handle day selection properly
  const toggleDay = (dayId: number) => {
    setSelectedDays(current => 
      current.includes(dayId) 
        ? current.filter(id => id !== dayId) 
        : [...current, dayId]
    );
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
          
          // Process all selected days
          for (const dayIndex of selectedDays) {
            // Find slots for the current day and time
            const key = `${dayIndex}-${currentSlot.start_time}`;
            const slotsForDay = slotsByDayAndTime[key] || [];
            
            if (slotsForDay.length > 0) {
              for (const slot of slotsForDay) {
                try {
                  const assignment = {
                    slot_id: slot.id,
                    worker_id: form.workerId,
                    role: roleName,
                    week_start: format(currentWeek, 'yyyy-MM-dd'),
                    is_recurring: false,
                    notes: form.additionalText || undefined
                  };
                  
                  console.log(`Creating producer assignment with week_start: ${format(currentWeek, 'yyyy-MM-dd')}`);
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
          // Create a single assignment for the current slot
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
                {/* Show only visible worker forms - initially 2 */}
                {producerForms.slice(0, visibleWorkerCount).map((form, index) => (
                  <div key={`producer-form-${index}`} className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <Label htmlFor={`worker-${index}`} className="mb-2 block">עובד {index + 1}</Label>
                      <Select 
                        value={form.workerId} 
                        onValueChange={(value) => updateProducerForm(index, 'workerId', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="בחר עובד" />
                        </SelectTrigger>
                        <SelectContent>
                          {producers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} 
                              {worker.position && (
                                <span className="text-gray-500 text-sm"> ({worker.position})</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        type="text"
                        value={form.additionalText || ""}
                        onChange={(e) => updateProducerForm(index, 'additionalText', e.target.value)}
                        placeholder="הערות נוספות..."
                        className="w-full mt-2 p-2 border rounded text-sm"
                      />
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
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                {/* Button to add more workers */}
                {visibleWorkerCount < 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={addWorkerForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    הוסף עובד נוסף
                  </Button>
                )}
                
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-4">אפשרויות נוספות:</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label htmlFor="permanent-toggle">משבץ קבוע (חל על כל השבועות)</Label>
                        <Switch 
                          id="permanent-toggle" 
                          checked={isPermanent}
                          onCheckedChange={(checked) => {
                            setIsPermanent(checked);
                            if (checked) setSelectedDays([]); // Clear selected days when selecting permanent
                          }}
                        />
                      </div>
                    </div>
                    
                    {!isPermanent && (
                      <div>
                        <Label className="mb-2 block">הוסף לימים נוספים בשבוע זה:</Label>
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                            <Button
                              key={`day-toggle-${day}`}
                              type="button"
                              variant={selectedDays.includes(day) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleDay(day)}
                              className={`${selectedDays.includes(day) ? 'bg-primary text-primary-foreground' : ''}`}
                            >
                              {dayNames[day]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleCloseDialog}>ביטול</Button>
                <Button onClick={handleSubmit}>שמור</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAssignments;
