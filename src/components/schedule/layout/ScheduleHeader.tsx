import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, CalendarDays } from 'lucide-react'
import { ViewMode } from '@/types/schedule'
import { cn } from '@/lib/utils'

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
    const delta = direction === 'next' ? 1 : -1;
    if (viewMode === 'weekly') {
      // Use ISO date to avoid time drift
      const base = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const next = addWeeks(base, delta);
      setSelectedDate(next);
    } else {
      const base = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      base.setDate(base.getDate() + delta);
      setSelectedDate(base);
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const dateRangeDisplay = viewMode === 'weekly'
    ? `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`
    : `${format(selectedDate, 'dd/MM/yyyy')}`;

  // If hideDateControls is true, only show the add button and view mode controls
  if (hideDateControls) {
    return (
      <div className="flex items-center justify-end">
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
              הוסף משבצת שידור
            </Button>
          )}
        </div>
      </div>
    );
  }

  const prevLabel = viewMode === 'weekly' ? 'שבוע קודם' : 'ליום הקודם';
  const nextLabel = viewMode === 'weekly' ? 'שבוע הבא' : 'ליום הבא';

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 animate-in">
      <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-slate-200 premium-shadow">
        {!hideDateControls && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
              title={prevLabel}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div className="px-4 py-1.5 min-w-[120px] text-center">
              <span className="text-lg font-bold text-slate-700">
                {dateRangeDisplay}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
              title={nextLabel}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex bg-white/50 p-1 rounded-xl border border-slate-200">
          <Button
            variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-lg flex items-center gap-2 h-9",
              viewMode === 'daily' ? "shadow-sm" : ""
            )}
            onClick={() => setViewMode('daily')}
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="font-bold text-xs uppercase tracking-wider">יומי</span>
          </Button>
          <Button
            variant={viewMode === 'weekly' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-lg flex items-center gap-2 h-9",
              viewMode === 'weekly' ? "shadow-sm" : ""
            )}
            onClick={() => setViewMode('weekly')}
          >
            <CalendarDays className="h-4 w-4" />
            <span className="font-bold text-xs uppercase tracking-wider">שבועי</span>
          </Button>
        </div>

        {isAdmin && showAddButton && (
          <Button
            onClick={handleAddSlot}
            className="flex items-center gap-2 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="font-bold">הוסף משבצת</span>
          </Button>
        )}
      </div>


      {showDatePicker && viewMode !== 'weekly' && (
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
