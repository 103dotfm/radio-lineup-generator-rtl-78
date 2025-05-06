
import React, { useState, useEffect } from 'react';
import { format, addDays, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { useWorkers } from '@/hooks/useWorkers';
import { useFilterWorkersByDivision } from '@/hooks/useWorkerDivisions';
import { Worker } from '@/lib/supabase/workers';

// Sample mock data for digital work arrangement
interface DigitalShift {
  id: string;
  day: number;
  worker_id: string;
  worker_name?: string;
  start_time: string;
  end_time: string;
  task: string;
  notes?: string;
}

const DigitalWorkArrangementEditor: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [shifts, setShifts] = useState<DigitalShift[]>([]);
  const [editingShift, setEditingShift] = useState<DigitalShift | null>(null);
  const [showShiftForm, setShowShiftForm] = useState<boolean>(false);
  
  const [day, setDay] = useState<number>(0);
  const [workerId, setWorkerId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [task, setTask] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { toast } = useToast();
  
  // Digital division workers
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [workersLoading, setWorkersLoading] = useState(true);
  const { workers, loading: allWorkersLoading } = useWorkers();
  
  // Get workers in the digital division (assuming there's a division with this ID)
  const digitalDivisionId = '4d909eba-6d11-42b7-999a-e8a243ca918c'; // Replace with actual ID
  const { workerIds, loading: divisionWorkersLoading } = useFilterWorkersByDivision(digitalDivisionId);
  
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
  
  // Load shifts for the current week
  useEffect(() => {
    const loadShifts = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be a call to your backend/database
        // For now, let's use mock data
        
        // Mock data - in a real app this would come from your database
        const mockShifts: DigitalShift[] = [
          {
            id: '1',
            day: 0,
            worker_id: '123',
            worker_name: 'דני לוי',
            start_time: '08:00',
            end_time: '16:00',
            task: 'עריכת תוכן',
            notes: 'הכנת פוסטים לפייסבוק'
          },
          {
            id: '2',
            day: 1,
            worker_id: '456',
            worker_name: 'מיכל כהן',
            start_time: '09:00',
            end_time: '17:00',
            task: 'ניהול סושיאל',
            notes: 'מענה לתגובות'
          },
          {
            id: '3',
            day: 2,
            worker_id: '789',
            worker_name: 'אריק גולן',
            start_time: '10:00',
            end_time: '18:00',
            task: 'הפקת תוכן וידאו',
            notes: 'סרטון שבועי'
          }
        ];
        
        setShifts(mockShifts);
      } catch (error) {
        console.error('Error loading shifts:', error);
        toast({
          title: "שגיאה",
          description: "שגיאה בטעינת משמרות",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShifts();
  }, [currentWeek, toast]);
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };
  
  const handleAddShift = () => {
    resetForm();
    setShowShiftForm(true);
    setEditingShift(null);
  };
  
  const handleEditShift = (shift: DigitalShift) => {
    setDay(shift.day);
    setWorkerId(shift.worker_id);
    setStartTime(shift.start_time);
    setEndTime(shift.end_time);
    setTask(shift.task);
    setNotes(shift.notes || '');
    setShowShiftForm(true);
    setEditingShift(shift);
  };
  
  const handleDeleteShift = (shiftId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את המשמרת?')) {
      // In a real app, this would be a call to your backend to delete the shift
      setShifts(shifts.filter(shift => shift.id !== shiftId));
      toast({
        title: "נמחק בהצלחה",
        description: "המשמרת נמחקה בהצלחה",
      });
    }
  };
  
  const resetForm = () => {
    setDay(0);
    setWorkerId("");
    setStartTime("");
    setEndTime("");
    setTask("");
    setNotes("");
  };
  
  const handleSubmit = () => {
    // Basic validation
    if (!workerId || !startTime || !endTime || !task) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות החובה",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would be a call to your backend to save the shift
    const selectedWorker = filteredWorkers.find(w => w.id === workerId);
    
    if (editingShift) {
      // Update existing shift
      setShifts(shifts.map(shift => 
        shift.id === editingShift.id
          ? {
              ...shift,
              day,
              worker_id: workerId,
              worker_name: selectedWorker?.name,
              start_time: startTime,
              end_time: endTime,
              task,
              notes
            }
          : shift
      ));
      
      toast({
        title: "עודכן בהצלחה",
        description: "המשמרת עודכנה בהצלחה",
      });
    } else {
      // Add new shift
      const newShift: DigitalShift = {
        id: Math.random().toString(36).substring(7), // In a real app, this would come from your backend
        day,
        worker_id: workerId,
        worker_name: selectedWorker?.name,
        start_time: startTime,
        end_time: endTime,
        task,
        notes
      };
      
      setShifts([...shifts, newShift]);
      
      toast({
        title: "נוסף בהצלחה",
        description: "המשמרת נוספה בהצלחה",
      });
    }
    
    setShowShiftForm(false);
    resetForm();
  };
  
  const weekDisplay = `${format(currentWeek, 'dd/MM/yyyy', { locale: he })} - ${format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he })}`;
  
  const days = [
    "ראשון",
    "שני",
    "שלישי",
    "רביעי",
    "חמישי",
    "שישי",
    "שבת"
  ];
  
  const getShiftsByDay = (dayIndex: number) => {
    return shifts.filter(shift => shift.day === dayIndex);
  };
  
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">סידור עבודה דיגיטל</h2>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigateWeek('prev')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 border rounded flex items-center min-w-[200px] justify-center">
            <Calendar className="ml-2 h-4 w-4" />
            <span className="text-sm font-medium">{weekDisplay}</span>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigateWeek('next')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div>
        <Button onClick={handleAddShift}>הוסף משמרת</Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="mr-2">טוען משמרות...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map((dayName, index) => (
            <Card key={index} className="p-4">
              <h3 className="text-lg font-medium mb-2">{dayName}</h3>
              <div className="space-y-2">
                {getShiftsByDay(index).length > 0 ? (
                  getShiftsByDay(index).map(shift => (
                    <div 
                      key={shift.id} 
                      className="bg-gray-100 p-2 rounded text-sm cursor-pointer hover:bg-gray-200"
                      onClick={() => handleEditShift(shift)}
                    >
                      <div className="font-medium">{shift.worker_name}</div>
                      <div>{shift.start_time} - {shift.end_time}</div>
                      <div>{shift.task}</div>
                      {shift.notes && <div className="text-gray-600 text-xs mt-1">{shift.notes}</div>}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1 h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShift(shift.id);
                        }}
                      >
                        מחק
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center">אין משמרות</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {showShiftForm && (
        <Card className="p-6">
          <h3 className="text-xl font-medium mb-4">
            {editingShift ? 'עריכת משמרת' : 'הוספת משמרת'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="day">יום</Label>
              <Select value={day.toString()} onValueChange={(value) => setDay(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="בחר יום" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((dayName, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {dayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="worker">עובד</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="בחר עובד" />
                </SelectTrigger>
                <SelectContent>
                  {workersLoading ? (
                    <SelectItem value="loading">טוען עובדים...</SelectItem>
                  ) : filteredWorkers.length === 0 ? (
                    <SelectItem value="noworkers">לא נמצאו עובדים במחלקת דיגיטל</SelectItem>
                  ) : (
                    filteredWorkers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start_time">שעת התחלה</Label>
              <Input 
                id="start_time" 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
              />
            </div>
            
            <div>
              <Label htmlFor="end_time">שעת סיום</Label>
              <Input 
                id="end_time" 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="task">משימה</Label>
              <Input 
                id="task" 
                value={task} 
                onChange={(e) => setTask(e.target.value)} 
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows={3} 
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse mt-4">
            <Button variant="outline" onClick={() => setShowShiftForm(false)}>
              ביטול
            </Button>
            <Button onClick={handleSubmit}>
              {editingShift ? 'עדכון' : 'הוספה'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DigitalWorkArrangementEditor;
