import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, startOfMonth, getDaysInMonth, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewMode, ScheduleSlot } from '@/types/schedule';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import ScheduleSlotDialog from './ScheduleSlotDialog';
import { useNavigate } from 'react-router-dom';

interface ScheduleViewProps {
  isAdmin?: boolean;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ isAdmin = false }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  
  // Fetch schedule slots
  const { data: scheduleSlots = [] } = useQuery({
    queryKey: ['scheduleSlots'],
    queryFn: getScheduleSlots,
  });

  // Create schedule slot mutation
  const createSlotMutation = useMutation({
    mutationFn: createScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
      toast({ title: 'משבצת שידור נוספה בהצלחה' });
    },
    onError: (error) => {
      console.error('Error creating slot:', error);
      toast({ 
        title: 'שגיאה בהוספת משבצת שידור',
        variant: 'destructive'
      });
    },
  });

  // Update schedule slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleSlot> }) =>
      updateScheduleSlot(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
      toast({ title: 'משבצת שידור עודכנה בהצלחה' });
    },
    onError: (error) => {
      console.error('Error updating slot:', error);
      toast({ 
        title: 'שגיאה בעדכון משבצת שידור',
        variant: 'destructive'
      });
    },
  });

  // Delete schedule slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: deleteScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
      toast({ title: 'משבצת שידור נמחקה בהצלחה' });
    },
    onError: (error) => {
      console.error('Error deleting slot:', error);
      toast({ 
        title: 'שגיאה במחיקת משבצת שידור',
        variant: 'destructive'
      });
    },
  });

  // Handle slot actions
  const handleAddSlot = () => {
    setEditingSlot(undefined);
    setShowSlotDialog(true);
  };

  const handleEditSlot = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setShowSlotDialog(true);
  };

  const handleDeleteSlot = async (slot: ScheduleSlot) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משבצת שידור זו?')) {
      await deleteSlotMutation.mutateAsync(slot.id);
    }
  };

  const handleSaveSlot = async (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSlot) {
      await updateSlotMutation.mutateAsync({ id: editingSlot.id, updates: slotData });
    } else {
      await createSlotMutation.mutateAsync(slotData);
    }
  };

  const handleSlotClick = (slot: ScheduleSlot) => {
    if (isAdmin) {
      handleEditSlot(slot);
    } else {
      navigate('/new', { state: { showName: slot.show_name } });
    }
  };

  // Generate time slots from 06:00 to 02:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 6; i <= 23; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    // Add the next day's hours (00:00 to 02:00)
    for (let i = 0; i <= 2; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const dates = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return [selectedDate];
      case 'weekly': {
        const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 0 });
        return Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));
      }
      case 'monthly': {
        const monthStart = startOfMonth(selectedDate);
        const daysInMonth = getDaysInMonth(selectedDate);
        return Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
      }
      default:
        return [];
    }
  }, [selectedDate, viewMode]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : 30;
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - days);
    } else {
      newDate.setDate(newDate.getDate() + days);
    }
    setSelectedDate(newDate);
  };

  const renderGrid = () => {
    switch (viewMode) {
      case 'daily':
        return (
          <div className="grid grid-cols-[auto,1fr]">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              {weekDays[selectedDate.getDay()]}
              <div className="text-sm text-gray-600">
                {format(selectedDate, 'dd/MM')}
              </div>
            </div>
            {timeSlots.map((time) => (
              <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                <div className="p-2 border-b border-r min-h-[60px]">
                  {/* Placeholder for schedule items */}
                </div>
              </React.Fragment>
            ))}
          </div>
        );

      case 'weekly':
        return (
          <div className="grid grid-cols-[auto,repeat(7,1fr)]">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {dates.map((date, index) => (
              <div key={index} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
                {weekDays[date.getDay()]}
                <div className="text-sm text-gray-600">
                  {format(date, 'dd/MM')}
                </div>
              </div>
            ))}
            {timeSlots.map((time) => (
              <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div
                    key={`${time}-${dayIndex}`}
                    className="p-2 border-b border-r last:border-r-0 min-h-[60px]"
                  >
                    {/* Placeholder for schedule items */}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        );

      case 'monthly':
        return (
          <div className="grid grid-cols-[auto,repeat(7,1fr)]">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {weekDays.map((day) => (
              <div key={day} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
                {day}
              </div>
            ))}
            {timeSlots.map((time) => (
              <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {weekDays.map((_, dayIndex) => {
                  const isCurrentMonth = dates.some(
                    (date) => 
                      date.getDay() === dayIndex && 
                      isSameMonth(date, selectedDate)
                  );
                  return (
                    <div
                      key={`${time}-${dayIndex}`}
                      className={`p-2 border-b border-r last:border-r-0 min-h-[60px] ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      }`}
                    >
                      {/* Placeholder for schedule items */}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('prev')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('next')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(value: ViewMode) => setViewMode(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">יומי</SelectItem>
              <SelectItem value="weekly">שבועי</SelectItem>
              <SelectItem value="monthly">חודשי</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Button onClick={handleAddSlot} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              הוסף משבצת
            </Button>
          )}
        </div>
      </div>

      {showDatePicker && (
        <div className="absolute z-50 bg-white border rounded-md shadow-lg p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setShowDatePicker(false);
              }
            }}
            locale={he}
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        {renderGrid()}
      </div>

      <ScheduleSlotDialog
        isOpen={showSlotDialog}
        onClose={() => {
          setShowSlotDialog(false);
          setEditingSlot(undefined);
        }}
        onSave={handleSaveSlot}
        editingSlot={editingSlot}
      />
    </div>
  );
};

export default ScheduleView;
