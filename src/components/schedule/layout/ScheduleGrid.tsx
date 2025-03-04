
import React from 'react';
import { format, addDays, startOfWeek, isToday, addWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScheduleSlot, DayNote, ViewMode } from '@/types/schedule';
import ScheduleGridCell from './ScheduleGridCell';
import DayNoteComponent from './DayNote';

interface ScheduleGridProps {
  scheduleSlots: ScheduleSlot[];
  selectedDate: Date;
  viewMode: ViewMode;
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hideHeaderDates?: boolean;
  dayNotes?: DayNote[];
  onDayNoteChange?: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  onDayNoteDelete?: (noteId: string) => Promise<void>;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  scheduleSlots,
  selectedDate,
  viewMode,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated,
  hideHeaderDates = false,
  dayNotes = [],
  onDayNoteChange,
  onDayNoteDelete
}) => {
  // Helper function to get day note for a specific date
  const getDayNote = (date: Date): DayNote | null => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return dayNotes.find(note => note.date === formattedDate) || null;
  };

  // Weekly view rendering
  const renderWeeklyView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const days = [0, 1, 2, 3, 4, 5, 6]; // Days of the week

    return (
      <div className="grid grid-cols-7 gap-1 mt-4">
        {/* Day headers */}
        {days.map((day) => {
          const date = addDays(weekStart, day);
          const formattedDate = format(date, 'd', { locale: he });
          const dayName = format(date, 'EEEE', { locale: he });
          const isCurrentDay = isToday(date);
          
          return (
            <div key={day} className="text-center mb-1">
              <div className={cn(
                "text-base font-medium p-1 rounded",
                isCurrentDay ? "bg-blue-100 text-blue-800" : ""
              )}>
                {!hideHeaderDates && (
                  <div>{formattedDate}</div>
                )}
                <div className="font-bold">{dayName}</div>
                
                {onDayNoteChange && onDayNoteDelete && (
                  <DayNoteComponent
                    note={getDayNote(date)}
                    date={date}
                    onSave={onDayNoteChange}
                    onDelete={onDayNoteDelete}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Time slots */}
        {days.map((day) => {
          const date = addDays(weekStart, day);
          return (
            <div key={day} className="relative group">
              {scheduleSlots
                .filter(slot => slot.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map(slot => (
                  <ScheduleGridCell
                    key={slot.id}
                    slot={slot}
                    date={date}
                    onClick={() => handleSlotClick(slot)}
                    onEdit={(e) => handleEditSlot(slot, e)}
                    onDelete={(e) => handleDeleteSlot(slot, e)}
                    isAdmin={isAdmin}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
            </div>
          );
        })}
      </div>
    );
  };

  // Daily view rendering
  const renderDailyView = () => {
    const formattedDate = format(selectedDate, 'EEEE, d MMMM', { locale: he });

    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">{formattedDate}</h2>
        <div>
          {scheduleSlots
            .filter(slot => format(selectedDate, 'yyyy-MM-dd') === format(addDays(startOfWeek(selectedDate, { weekStartsOn: 0 }), slot.day_of_week), 'yyyy-MM-dd'))
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map(slot => (
              <ScheduleGridCell
                key={slot.id}
                slot={slot}
                date={selectedDate}
                onClick={() => handleSlotClick(slot)}
                onEdit={(e) => handleEditSlot(slot, e)}
                onDelete={(e) => handleDeleteSlot(slot, e)}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
              />
            ))}
        </div>
      </div>
    );
  };

  // Monthly view rendering
  const renderMonthlyView = () => {
    const monthStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const monthEnd = addDays(addWeeks(monthStart, 5), 6);
    const currentDate = monthStart;
    const calendar = [];

    while (currentDate <= monthEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(addDays(currentDate, i));
      }
      calendar.push(week);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return (
      <div className="space-y-4">
        {calendar.map((week, index) => (
          <div key={index} className="flex justify-between">
            {week.map(date => {
              const formattedDate = format(date, 'd', { locale: he });
              return (
                <div key={date.toISOString()} className="w-1/7 text-center">
                  {formattedDate}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Determine which view to render
  switch (viewMode) {
    case 'daily':
      return renderDailyView();
    case 'monthly':
      return renderMonthlyView();
    case 'weekly':
    default:
      return renderWeeklyView();
  }
};

export default ScheduleGrid;
