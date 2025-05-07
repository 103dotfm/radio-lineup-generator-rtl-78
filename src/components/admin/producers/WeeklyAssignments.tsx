
import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useScheduleSlots } from '@/components/schedule/hooks/useScheduleSlots';
import { Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { ProducerAssignment, getProducerAssignments, createProducerAssignment, deleteProducerAssignment } from '@/lib/supabase/producers';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScheduleSlot } from '@/types/schedule';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
  refreshTrigger?: number;
  onAssignmentChange?: () => void;
}

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ 
  currentWeek,
  refreshTrigger = 0,
  onAssignmentChange
}) => {
  // Get schedule slots for the week (passing false to get weekly schedule)
  const { scheduleSlots, isLoading: slotsLoading } = useScheduleSlots(currentWeek, false);
  
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("עריכה");
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [additionalText, setAdditionalText] = useState<string>("");
  
  const { toast } = useToast();
  
  // Load assignments when currentWeek or refreshTrigger changes
  useEffect(() => {
    loadAssignments();
  }, [currentWeek, refreshTrigger]);
  
  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const assignmentsData = await getProducerAssignments(currentWeek);
      console.log(`Loaded ${assignmentsData.length} assignments for week starting ${currentWeek.toDateString()}`, assignmentsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת שיבוצי הפקה",
        variant: "destructive",
      });
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenDialog = (slot: ScheduleSlot) => {
    setSelectedSlot(slot);
    setSelectedWorker(null);
    setSelectedRole("עריכה");
    setAdditionalText("");
    setDialogOpen(true);
  };
  
  const handleAssign = async () => {
    if (!selectedSlot || !selectedWorker || !selectedRole) {
      toast({
        title: "שגיאה",
        description: "חסרים פרטים לשיבוץ",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const formattedDate = currentWeek.toISOString().split('T')[0];
      const assignment: Partial<ProducerAssignment> = {
        slot_id: selectedSlot.id,
        worker_id: selectedWorker,
        role: selectedRole,
        notes: additionalText.trim() || undefined,
        week_start: formattedDate,
        is_recurring: false
      };
      
      console.log("Creating assignment with data:", assignment);
      
      await createProducerAssignment(assignment);
      
      toast({
        title: "נשמר בהצלחה",
        description: "השיבוץ נשמר בהצלחה",
      });
      
      await loadAssignments();
      setDialogOpen(false);
      
      // Notify parent component about the change
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error("Error assigning worker:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשיבוץ העובד",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async (assignmentId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את השיבוץ?")) return;
    
    try {
      setIsLoading(true);
      console.log(`Deleting assignment ${assignmentId}`);
      await deleteProducerAssignment(assignmentId);
      
      toast({
        title: "נמחק בהצלחה",
        description: "השיבוץ נמחק בהצלחה",
      });
      
      await loadAssignments();
      
      // Notify parent component about the change
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה במחיקת השיבוץ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Group slots by day for easier display
  const slotsByDay: { [key: number]: ScheduleSlot[] } = {};
  scheduleSlots.forEach(slot => {
    if (!slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week] = [];
    }
    slotsByDay[slot.day_of_week].push(slot);
  });
  
  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: string): ProducerAssignment[] => {
    return assignments.filter(assignment => assignment.slot_id === slotId);
  };
  
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  
  if (isLoading || slotsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
          const daySlots = slotsByDay[dayIndex] || [];
          const dayDate = addDays(currentWeek, dayIndex);
          
          if (daySlots.length === 0) return null;
          
          return (
            <Card key={`day-${dayIndex}`} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-muted p-3 font-medium text-lg">
                  {dayNames[dayIndex]} - {format(dayDate, 'dd/MM', { locale: he })}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/4">שעה</TableHead>
                      <TableHead className="w-1/4">תוכנית</TableHead>
                      <TableHead className="w-2/5">שיבוצי הפקה</TableHead>
                      <TableHead className="w-1/12">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daySlots.map(slot => {
                      const slotAssignments = getAssignmentsForSlot(slot.id);
                      
                      return (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium">
                            {slot.start_time} - {slot.end_time}
                          </TableCell>
                          <TableCell>
                            {getCombinedShowDisplay(slot.show_name, slot.host_name)}
                          </TableCell>
                          <TableCell>
                            {slotAssignments.length > 0 ? (
                              <div className="space-y-1">
                                {slotAssignments.map(assignment => (
                                  <div key={assignment.id} className="flex justify-between items-center bg-muted/50 px-2 py-1 rounded">
                                    <div>
                                      <span className="font-medium">{assignment.role}: </span>
                                      <span>{assignment.worker?.name}</span>
                                      {assignment.notes && (
                                        <span className="text-gray-500 ml-2">({assignment.notes})</span>
                                      )}
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleDelete(assignment.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">אין שיבוצים</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(slot)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> הוספה
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
        
        {Object.keys(slotsByDay).length === 0 && (
          <div className="text-center py-8 border rounded-md">
            <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <h3 className="text-lg font-medium">אין משבצות לשבוע זה</h3>
            <p className="text-gray-500 mt-1">יש להגדיר משבצות בלוח השידורים תחילה</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שיבוץ עובד הפקה</DialogTitle>
          </DialogHeader>
          
          {selectedSlot && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded">
                <div className="font-medium">{getCombinedShowDisplay(selectedSlot.show_name, selectedSlot.host_name)}</div>
                <div className="text-sm text-gray-500">
                  {dayNames[selectedSlot.day_of_week]} {selectedSlot.start_time} - {selectedSlot.end_time}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="font-medium">תפקיד</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="עריכה">עריכה</SelectItem>
                      <SelectItem value="הפקה">הפקה</SelectItem>
                      <SelectItem value="מפיק/ה">מפיק/ה</SelectItem>
                      <SelectItem value="עורך/ת">עורך/ת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium">שיבוץ עובד</label>
                  <WorkerSelector
                    value={selectedWorker}
                    onChange={(value, text) => {
                      setSelectedWorker(value);
                      setAdditionalText(text || '');
                    }}
                    additionalText={additionalText}
                    department="producers" // Filter to show only producers
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleAssign} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              שבץ עובד
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WeeklyAssignments;
