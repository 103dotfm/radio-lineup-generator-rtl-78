import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, CalendarDays } from 'lucide-react'
import { ViewMode } from '@/types/schedule'

interface ScheduleHeaderProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  handleAddSlot: () => void;
  isAdmin: boolean;
  showAddButton: boolean;
  hideDateControls: boolean;
}

export default function ScheduleHeader({
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  showDatePicker,
  setShowDatePicker,
  handleAddSlot,
  isAdmin,
  showAddButton,
  hideDateControls
}: ScheduleHeaderProps) {
  
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - (viewMode === 'weekly' ? 7 : 1));
    } else {
      newDate.setDate(newDate.getDate() + (viewMode === 'weekly' ? 7 : 1));
    }
    setSelectedDate(newDate);
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const dateRangeDisplay = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;

  if (hideDateControls) return null;

  return (
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
        </div>

        {isAdmin && showAddButton && (
          <Button onClick={handleAddSlot} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            הוסף משבצת
          </Button>
        )}
      </div>

      {showDatePicker && (
        <div className="absolute z-50 bg-white border rounded-md shadow-lg p-2">
          <Calendar 
            mode="single" 
            selected={selectedDate} 
            onSelect={date => {
              if (date) {
                setSelectedDate(date);
                setShowDatePicker(false);
              }
            }} 
            locale={he} 
          />
        </div>
      )}
    </div>
  );
}
