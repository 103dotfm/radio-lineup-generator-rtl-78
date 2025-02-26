import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, startOfMonth, getDaysInMonth, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewMode, ScheduleSlot } from '@/types/schedule';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, FileCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import ScheduleSlotDialog from './ScheduleSlotDialog';
import EditModeDialog from './EditModeDialog';
import { useNavigate } from 'react-router-dom';
import { getShowDisplay } from '@/utils/showDisplay';

interface ScheduleViewProps {
  isAdmin?: boolean;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  isAdmin = false
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const {
    data: scheduleSlots = []
  } = useQuery({
    queryKey: ['scheduleSlots', selectedDate],
    queryFn: () => getScheduleSlots(selectedDate)
  });
  const createSlotMutation = useMutation({
    mutationFn: createScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      toast({
        title: 'משבצת שידור נוספה בהצלחה'
      });
    },
    onError: error => {
      console.error('Error creating slot:', error);
      toast({
        title: 'שגיאה בהוספת משבצת שידור',
        variant: 'destructive'
      });
    }
  });
  const updateSlotMutation = useMutation({
    mutationFn: ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<ScheduleSlot>;
    }) => updateScheduleSlot(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      toast({
        title: 'משבצת שידור עודכנה בהצלחה'
      });
    },
    onError: error => {
      console.error('Error updating slot:', error);
      toast({
        title: 'שגיאה בעדכון משבצת שידור',
        variant: 'destructive'
      });
    }
  });
  const deleteSlotMutation = useMutation({
    mutationFn: deleteScheduleSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      toast({
        title: 'משבצת שידור נמחקה בהצלחה'
      });
    },
    onError: error => {
      console.error('Error deleting slot:', error);
      toast({
        title: 'שגיאה במחיקת משבצת שידור',
        variant: 'destructive'
      });
    }
  });

  const handleAddSlot = () => {
    setEditingSlot(undefined);
    setShowSlotDialog(true);
  };

  const handleDeleteSlot = async (slot: ScheduleSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('האם אתה בטוח שברצונך למחוק משבצת שידור זו?')) {
      await deleteSlotMutation.mutateAsync(slot.id);
    }
  };

  const handleEditSlot = (slot: ScheduleSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSlot(slot);
    setShowEditModeDialog(true);
  };

  const handleEditCurrent = () => {
    setShowEditModeDialog(false);
    setShowSlotDialog(true);
  };

  const handleEditAll = () => {
    setShowEditModeDialog(false);
    setShowSlotDialog(true);
  };

  const handleSaveSlot = async (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSlot) {
      if (showEditModeDialog) {
        await updateSlotMutation.mutateAsync({
          id: editingSlot.id,
          updates: {
            ...slotData,
            is_modified: false
          }
        });
      } else {
        await updateSlotMutation.mutateAsync({
          id: editingSlot.id,
          updates: {
            ...slotData,
            is_modified: true
          }
        });
      }
    } else {
      await createSlotMutation.mutateAsync(slotData);
    }
  };

  const handleSlotClick = (slot: ScheduleSlot) => {
    console.log('Clicked slot:', slot);
    if (slot.shows && slot.shows.length > 0) {
      const show = slot.shows[0];
      console.log('Found existing show, navigating to:', show.id);
      navigate(`/show/${show.id}`);
    } else {
      console.log('No existing show found, creating new show for slot:', slot.id);
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const slotDate = addDays(weekStart, slot.day_of_week);
      
      navigate('/new', {
        state: {
          showName: slot.show_name,
          hostName: slot.host_name,
          time: slot.start_time,
          date: slotDate,
          isPrerecorded: slot.is_prerecorded,
          isCollection: slot.is_collection,
          slotId: slot.id
        }
      });
    }
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isSlotStartTime = (slot: ScheduleSlot, timeSlot: string) => {
    const slotStartMinutes = timeToMinutes(slot.start_time);
    const currentTimeMinutes = timeToMinutes(timeSlot);
    return slotStartMinutes === currentTimeMinutes;
  };

  const getSlotColor = (slot: ScheduleSlot) => {
    if (slot.is_modified) return 'bg-yellow-200';
    if (slot.is_collection) return 'bg-orange-500 text-white';
    if (slot.is_prerecorded) return 'bg-purple-500 text-white';
    if (!slot.is_recurring) return 'bg-orange-200';
    return 'bg-green-100';
  };

  const getSlotHeight = (slot: ScheduleSlot) => {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    const hoursDiff = (end - start) / 60;
    return `${hoursDiff * 60}px`;
  };

  const renderSlot = (slot: ScheduleSlot) => {
    const {
      displayName,
      displayHost
    } = getShowDisplay(slot.show_name, slot.host_name);
    return <div key={slot.id} onClick={() => handleSlotClick(slot)} className={`p-2 rounded cursor-pointer hover:opacity-80 transition-colors group ${getSlotColor(slot)}`} style={{
      height: getSlotHeight(slot),
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      zIndex: 10
    }}>
        <div className="flex justify-between items-start">
          <div className="font-bold">{displayName}</div>
          {slot.has_lineup && <FileCheck className="h-4 w-4 text-green-600" />}
        </div>
        {displayHost && <div className="text-sm opacity-75">{displayHost}</div>}
        
        {isAdmin && <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
            <Button variant="ghost" size="sm" className="p-1 h-8 w-8" onClick={e => handleEditSlot(slot, e)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 h-8 w-8 hover:bg-red-100" onClick={e => handleDeleteSlot(slot, e)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>}
      </div>;
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 6; i <= 23; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    for (let i = 0; i <= 2; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const dates = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return [selectedDate];
      case 'weekly':
        {
          const startOfCurrentWeek = startOfWeek(selectedDate, {
            weekStartsOn: 0
          });
          return Array.from({
            length: 7
          }, (_, i) => addDays(startOfCurrentWeek, i));
        }
      case 'monthly':
        {
          const monthStart = startOfMonth(selectedDate);
          const daysInMonth = getDaysInMonth(selectedDate);
          return Array.from({
            length: daysInMonth
          }, (_, i) => addDays(monthStart, i));
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

  const renderTimeCell = (dayIndex: number, time: string, isCurrentMonth: boolean = true) => {
    const relevantSlots = scheduleSlots.filter(slot => slot.day_of_week === dayIndex && isSlotStartTime(slot, time));
    return <div className={`relative p-2 border-b border-r last:border-r-0 min-h-[60px] ${!isCurrentMonth ? 'bg-gray-50' : ''}`}>
        {isCurrentMonth && relevantSlots.map(renderSlot)}
      </div>;
  };

  const renderGrid = () => {
    switch (viewMode) {
      case 'daily':
        return <div className="grid grid-cols-[auto,1fr]">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              {weekDays[selectedDate.getDay()]}
              <div className="text-sm text-gray-600">
                {format(selectedDate, 'dd/MM')}
              </div>
            </div>
            {timeSlots.map(time => <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {renderTimeCell(selectedDate.getDay(), time)}
              </React.Fragment>)}
          </div>;
      case 'weekly':
        return <div className="grid grid-cols-[auto,repeat(7,1fr)]">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {dates.map((date, index) => <div key={index} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
                {weekDays[date.getDay()]}
                <div className="text-sm text-gray-600">
                  {format(date, 'dd/MM')}
                </div>
              </div>)}
            {timeSlots.map(time => <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {Array.from({
              length: 7
            }).map((_, dayIndex) => <React.Fragment key={`${time}-${dayIndex}`}>
                    {renderTimeCell(dayIndex, time)}
                  </React.Fragment>)}
              </React.Fragment>)}
          </div>;
      case 'monthly':
        return <div className="grid grid-cols-[auto,repeat(7,1fr)]">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {weekDays.map(day => <div key={day} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
                {day}
              </div>)}
            {timeSlots.map(time => <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {weekDays.map((_, dayIndex) => {
              const isCurrentMonth = dates.some(date => date.getDay() === dayIndex && isSameMonth(date, selectedDate));
              return renderTimeCell(dayIndex, time, isCurrentMonth);
            })}
              </React.Fragment>)}
          </div>;
    }
  };

  return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowDatePicker(!showDatePicker)}>
            {format(selectedDate, 'dd/MM/yyyy', {
            locale: he
          })}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">יומי</SelectItem>
              <SelectItem value="weekly">שבועי</SelectItem>
              <SelectItem value="monthly">חודשי</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && <Button onClick={handleAddSlot} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              הוסף משבצת
            </Button>}
        </div>
      </div>

      {showDatePicker && <div className="absolute z-50 bg-white border rounded-md shadow-lg p-2">
          <Calendar mode="single" selected={selectedDate} onSelect={date => {
        if (date) {
          setSelectedDate(date);
          setShowDatePicker(false);
        }
      }} locale={he} />
        </div>}

      <div className="border rounded-lg overflow-hidden">
        {renderGrid()}
      </div>

      <EditModeDialog isOpen={showEditModeDialog} onClose={() => setShowEditModeDialog(false)} onEditCurrent={handleEditCurrent} onEditAll={handleEditAll} />

      <ScheduleSlotDialog isOpen={showSlotDialog} onClose={() => {
      setShowSlotDialog(false);
      setEditingSlot(undefined);
    }} onSave={handleSaveSlot} editingSlot={editingSlot} />
    </div>;
};

export default ScheduleView;
