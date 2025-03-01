import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, startOfMonth, getDaysInMonth, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ViewMode, ScheduleSlot } from '@/types/schedule';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, FileCheck, CalendarDays, CalendarRange, Calendar as CalendarIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import ScheduleSlotDialog from './ScheduleSlotDialog';
import EditModeDialog from './EditModeDialog';
import { useNavigate } from 'react-router-dom';
import { getShowDisplay } from '@/utils/showDisplay';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduleViewProps {
  isAdmin?: boolean;
  isMasterSchedule?: boolean;
  hideDateControls?: boolean;
  showAddButton?: boolean;
  hideHeaderDates?: boolean;
  selectedDate?: Date;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  isAdmin = false,
  isMasterSchedule = false,
  hideDateControls = false,
  showAddButton = true,
  hideHeaderDates = false,
  selectedDate: externalSelectedDate
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(externalSelectedDate || new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const {
    data: scheduleSlots = [],
    isLoading
  } = useQuery({
    queryKey: ['scheduleSlots', selectedDate, isMasterSchedule],
    queryFn: () => {
      console.log('Fetching slots with params:', { selectedDate, isMasterSchedule });
      return getScheduleSlots(selectedDate, isMasterSchedule);
    },
    meta: {
      onSuccess: (data: ScheduleSlot[]) => {
        console.log('Successfully fetched slots:', data);
      },
      onError: (error: Error) => {
        console.error('Error fetching slots:', error);
      }
    }
  });

  useEffect(() => {
    console.log('Schedule slots updated:', scheduleSlots);
  }, [scheduleSlots]);

  const createSlotMutation = useMutation({
    mutationFn: (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => 
      createScheduleSlot(slotData, isMasterSchedule, selectedDate),
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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleSlot> }) => {
      console.log("Mutation updating slot:", { id, updates });
      return updateScheduleSlot(id, updates, isMasterSchedule, selectedDate);
    },
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
    mutationFn: (id: string) => deleteScheduleSlot(id, isMasterSchedule, selectedDate),
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
    if (!isMasterSchedule) {
      setEditingSlot(slot);
      setShowSlotDialog(true);
    } else {
      setEditingSlot(slot);
      setShowEditModeDialog(true);
    }
  };

  const handleEditCurrent = () => {
    setShowEditModeDialog(false);
    setShowSlotDialog(true);
  };

  const handleEditAll = () => {
    setShowEditModeDialog(false);
    setShowSlotDialog(true);
  };

  const handleSaveSlot = async (slotData: any) => {
    try {
      if (slotData.id) {
        console.log("Handling update for existing slot:", slotData.id);
        const { id, ...updates } = slotData;
        await updateSlotMutation.mutateAsync({ id, updates });
      } else {
        console.log("Creating new slot:", slotData);
        await createSlotMutation.mutateAsync(slotData);
      }
      setShowSlotDialog(false);
    } catch (error) {
      console.error('Error saving slot:', error);
      toast({
        title: 'שגיאה בשמירת משבצת שידור',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateSlot = async (id: string, updates: Partial<ScheduleSlot>) => {
    try {
      await updateSlotMutation.mutateAsync({ id, updates });
      toast({
        title: 'משבצת שידור עודכנה בהצלחה'
      });
    } catch (error) {
      console.error('Error updating slot:', error);
      throw error;
    }
  };

  const handleSlotClick = (slot: ScheduleSlot) => {
    if (!isAuthenticated) return;

    console.log('Clicked slot details:', {
      show_name: slot.show_name,
      host_name: slot.host_name,
      start_time: slot.start_time,
      is_prerecorded: slot.is_prerecorded,
      is_collection: slot.is_collection
    });

    if (slot.shows && slot.shows.length > 0) {
      const show = slot.shows[0];
      console.log('Found existing show, navigating to:', show.id);
      navigate(`/show/${show.id}`);
    } else {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const slotDate = addDays(weekStart, slot.day_of_week);
      
      const generatedShowName = slot.show_name === slot.host_name 
        ? slot.host_name 
        : `${slot.show_name} עם ${slot.host_name}`;

      console.log('Navigating to new lineup with generated name:', generatedShowName);
      
      navigate('/new', {
        state: {
          generatedShowName,
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
    if (slot.color) {
      switch (slot.color) {
        case 'green':
          return 'cell-regular';
        case 'yellow':
          return 'cell-modified';
        case 'blue':
          return 'cell-prerecorded';
        default:
          return 'cell-regular';
      }
    }
    
    if (slot.is_collection) return 'cell-collection';
    if (slot.is_prerecorded) return 'cell-prerecorded';
    if (slot.is_modified) return 'cell-modified';
    return 'cell-regular';
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
    
    const slotClickHandler = isAuthenticated ? () => handleSlotClick(slot) : undefined;
    
    return <div 
      key={slot.id} 
      onClick={slotClickHandler} 
      className={`p-2 rounded ${isAuthenticated ? 'cursor-pointer' : ''} hover:opacity-80 transition-colors group schedule-cell ${getSlotColor(slot)}`} 
      style={{
        height: getSlotHeight(slot),
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        zIndex: 10
      }}
    >
        <div className="flex justify-between items-start">
          <div className="font-bold">{displayName}</div>
          {slot.has_lineup && <FileCheck className="h-4 w-4 text-green-600" />}
        </div>
        {displayHost && <div className="text-sm opacity-75">{displayHost}</div>}
        
        {isAdmin && <div className="actions">
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
          const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 0 });
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
        return <div className="grid grid-cols-[auto,1fr]" dir="rtl">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              {weekDays[selectedDate.getDay()]}
              {!hideHeaderDates && (
                <div className="text-sm text-gray-600">
                  {format(selectedDate, 'dd/MM')}
                </div>
              )}
            </div>
            {timeSlots.map(time => <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {renderTimeCell(selectedDate.getDay(), time)}
              </React.Fragment>)}
          </div>;
      case 'weekly':
        return <div className="grid grid-cols-[auto,repeat(7,1fr)]" dir="rtl">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {dates.map((date, index) => <div key={index} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
                {weekDays[date.getDay()]}
                {!hideHeaderDates && (
                  <div className="text-sm text-gray-600">
                    {format(date, 'dd/MM')}
                  </div>
                )}
              </div>)}
            {timeSlots.map(time => <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {Array.from({length: 7}).map((_, dayIndex) => <React.Fragment key={`${time}-${dayIndex}`}>
                    {renderTimeCell(dayIndex, time)}
                  </React.Fragment>)}
              </React.Fragment>)}
          </div>;
      case 'monthly':
        return <div className="grid grid-cols-[auto,repeat(7,1fr)]" dir="rtl">
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

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const dateRangeDisplay = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;

  return <div className="space-y-4">
      {!hideDateControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowDatePicker(!showDatePicker)}>
              {dateRangeDisplay}
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-2 border rounded-md">
              <Button 
                variant={viewMode === 'daily' ? 'default' : 'ghost'} 
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setViewMode('daily')}
              >
                <CalendarIcon className="h-4 w-4" />
                <span>יומי</span>
              </Button>
              <Button 
                variant={viewMode === 'weekly' ? 'default' : 'ghost'} 
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setViewMode('weekly')}
              >
                <CalendarDays className="h-4 w-4" />
                <span>שבועי</span>
              </Button>
              <Button 
                variant={viewMode === 'monthly' ? 'default' : 'ghost'} 
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setViewMode('monthly')}
              >
                <CalendarRange className="h-4 w-4" />
                <span>חודשי</span>
              </Button>
            </div>

            {isAdmin && showAddButton && (
              <Button onClick={handleAddSlot} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                הוסף משבצת
              </Button>
            )}
          </div>
        </div>
      )}

      {showDatePicker && !hideDateControls && (
        <div className="absolute z-50 bg-white border rounded-md shadow-lg p-2">
          <Calendar mode="single" selected={selectedDate} onSelect={date => {
            if (date) {
              setSelectedDate(date);
              setShowDatePicker(false);
            }
          }} locale={he} />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        {renderGrid()}
      </div>

      {isAdmin && (
        <>
          <EditModeDialog 
            isOpen={showEditModeDialog} 
            onClose={() => setShowEditModeDialog(false)} 
            onEditCurrent={handleEditCurrent} 
            onEditAll={handleEditAll} 
          />

          <ScheduleSlotDialog 
            isOpen={showSlotDialog} 
            onClose={() => {
              setShowSlotDialog(false);
              setEditingSlot(undefined);
            }} 
            onSave={handleSaveSlot} 
            editingSlot={editingSlot} 
            isMasterSchedule={isMasterSchedule}
          />
        </>
      )}
    </div>;
};

export default ScheduleView;
