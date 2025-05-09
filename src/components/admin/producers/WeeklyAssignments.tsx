
import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Trash2 } from 'lucide-react';
import { getProducers, getProducerAssignments, createProducerAssignment, deleteProducerAssignment, createRecurringProducerAssignment, ProducerAssignment, Worker } from '@/lib/supabase/producers';
import { supabase } from '@/lib/supabase';

interface WeeklyAssignmentsProps {
  currentWeek: Date;
  onAssignmentChange?: () => void;
  refreshTrigger?: number;
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const PRODUCER_ROLES = [
  { value: 'editing', label: 'עריכה' },
  { value: 'production', label: 'הפקה' },
  { value: 'senior_editing', label: 'עריכה ראשית' },
  { value: 'evening_production', label: 'הפקת ערב' },
];

const WeeklyAssignments: React.FC<WeeklyAssignmentsProps> = ({ 
  currentWeek,
  onAssignmentChange,
  refreshTrigger = 0
}) => {
  const [slots, setSlots] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<ProducerAssignment[]>([]);
  const [producers, setProducers] = useState<Worker[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    workerId: '',
    role: 'editing',
    isRecurring: false,
  });
  const [loading, setLoading] = useState(false);

  // Prepare dates for the week
  const weekDates = useMemo(() => {
    return Array(7).fill(null).map((_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'dd/MM', { locale: he });
  };

  // Load data
  useEffect(() => {
    loadData();
  }, [currentWeek, refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load schedule slots
      const { data: scheduleSlotsData, error: scheduleSlotsError } = await supabase
        .from('schedule_slots')
        .select('*')
        .order('day_of_week')
        .order('start_time');
        
      if (scheduleSlotsError) throw scheduleSlotsError;
      
      // Load producers
      const producersData = await getProducers();
      
      // Load assignments for this week
      const assignmentsData = await getProducerAssignments(currentWeek);
      
      console.log('Loaded slots:', scheduleSlotsData?.length || 0);
      console.log('Loaded producers:', producersData?.length || 0);
      console.log('Loaded assignments:', assignmentsData?.length || 0);
      
      setSlots(scheduleSlotsData || []);
      setProducers(producersData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error('Error loading weekly assignments data:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את נתוני השיבוצים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (slot: any, day: number) => {
    setSelectedSlot(slot);
    setSelectedDay(day);
    setFormData({
      workerId: '',
      role: 'editing',
      isRecurring: false,
    });
    setDialogOpen(true);
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedSlot || selectedDay === null || !formData.workerId || !formData.role) {
      toast({
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    try {
      const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
      
      if (formData.isRecurring) {
        // Create recurring assignment
        await createRecurringProducerAssignment(
          selectedSlot.id,
          formData.workerId,
          formData.role,
          weekStartStr
        );
        
        toast({
          title: "נשמר בהצלחה",
          description: "שיבוץ קבוע נוסף בהצלחה",
        });
      } else {
        // Create one-time assignment
        await createProducerAssignment({
          slot_id: selectedSlot.id,
          worker_id: formData.workerId,
          role: formData.role,
          week_start: weekStartStr,
          is_recurring: false
        });
        
        toast({
          title: "נשמר בהצלחה",
          description: "השיבוץ נוסף בהצלחה",
        });
      }
      
      setDialogOpen(false);
      await loadData();
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את השיבוץ",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את השיבוץ?')) return;
    
    try {
      await deleteProducerAssignment(assignmentId);
      toast({
        title: "נמחק בהצלחה",
        description: "השיבוץ נמחק בהצלחה",
      });
      
      await loadData();
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את השיבוץ",
        variant: "destructive",
      });
    }
  };

  const getAssignmentsForSlot = (slotId: string, day: number) => {
    const daySlotAssignments = assignments.filter(assignment => {
      const isSlotMatch = assignment.slot_id === slotId;
      const isDayMatch = assignment.slot?.day_of_week === day;
      return isSlotMatch && isDayMatch;
    });
    
    // Sort assignments: regular first, then recurring, and alphabetically by role
    return daySlotAssignments.sort((a, b) => {
      // Sort by recurring status
      if ((a.is_recurring === true) && (b.is_recurring !== true)) return 1;
      if ((a.is_recurring !== true) && (b.is_recurring === true)) return -1;
      
      // If same recurring status, sort by role
      return a.role.localeCompare(b.role);
    });
  };

  const getSlotsForDay = (day: number) => {
    return slots.filter(slot => slot.day_of_week === day);
  };

  const getRoleName = (role: string) => {
    const roleObj = PRODUCER_ROLES.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">טוען נתונים...</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, index) => (
              <div key={index} className="text-center font-medium py-2 bg-gray-100 rounded">
                {DAYS_OF_WEEK[index]} {formatDate(date)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array(7).fill(null).map((_, day) => (
              <div key={day} className="space-y-2">
                {getSlotsForDay(day).map(slot => (
                  <Card key={slot.id} className="text-right">
                    <CardContent className="p-3">
                      <div className="font-medium">{slot.show_name}</div>
                      <div className="text-sm text-gray-500">
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </div>
                      
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenDialog(slot, day)}
                          className="w-full text-right justify-start"
                        >
                          + הוסף עובד
                        </Button>
                      </div>
                      
                      {getAssignmentsForSlot(slot.id, day).map(assignment => (
                        <div 
                          key={assignment.id} 
                          className={`mt-2 p-2 rounded text-sm flex justify-between ${
                            assignment.is_recurring 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'bg-green-50 border border-green-200'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{assignment.worker?.name}</div>
                            <div className="text-xs text-gray-600">{getRoleName(assignment.role)}</div>
                            {assignment.is_recurring && (
                              <div className="text-xs text-blue-600">קבוע</div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">הוספת שיבוץ</DialogTitle>
          </DialogHeader>
          
          {selectedSlot && (
            <div className="py-4">
              <div className="space-y-1 mb-4">
                <div className="font-medium">{selectedSlot.show_name}</div>
                <div className="text-sm text-gray-500">
                  {DAYS_OF_WEEK[selectedDay || 0]}, {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workerId" className="text-right block">בחר עובד</Label>
                  <Select 
                    value={formData.workerId} 
                    onValueChange={(value) => handleInputChange('workerId', value)}
                  >
                    <SelectTrigger className="w-full text-right">
                      <SelectValue placeholder="בחר עובד" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {producers.map(producer => (
                        <SelectItem key={producer.id} value={producer.id}>
                          {producer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-right block">תפקיד</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => handleInputChange('role', value)}
                  >
                    <SelectTrigger className="w-full text-right">
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {PRODUCER_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse justify-end">
                  <Checkbox 
                    id="isRecurring" 
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => 
                      handleInputChange('isRecurring', checked === true)
                    }
                  />
                  <Label 
                    htmlFor="isRecurring"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    שיבוץ קבוע (כל שבוע)
                  </Label>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start space-x-2 space-x-reverse">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    שים לב: שיבוצים קבועים יופיעו בכל שבוע. ניתן למחוק אותם בכל עת.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-end">
            <Button onClick={handleSubmit}>שמור שיבוץ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAssignments;
