
import React from 'react';
import { ScheduleSlot, DayNote } from '@/types/schedule';
import TimeCell from './TimeCell';
import DayHeader from './DayHeader';

interface WeeklyGridProps {
  dates: Date[];
  timeSlots: string[];
  scheduleSlots: ScheduleSlot[];
  weekDays: string[];
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hideHeaderDates: boolean;
  editingNoteDate: Date | null;
  getNoteForDate: (date: Date) => DayNote | null;
  handleDayHeaderClick: (date: Date) => void;
  handleSaveDayNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  handleDeleteDayNote: (noteId: string) => Promise<void>;
}

const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  dates,
  timeSlots,
  scheduleSlots,
  weekDays,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated,
  hideHeaderDates,
  editingNoteDate,
  getNoteForDate,
  handleDayHeaderClick,
  handleSaveDayNote,
  handleDeleteDayNote
}) => {
  return (
    <div className="grid grid-cols-[auto,repeat(7,1fr)]" dir="rtl">
      <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
        שעה
      </div>
      {dates.map((date, index) => (
        <DayHeader
          key={`header-${date.toISOString()}`}
          date={date}
          weekDays={weekDays}
          hideHeaderDates={hideHeaderDates}
          isAdmin={isAdmin}
          editingNoteDate={editingNoteDate}
          dayNote={getNoteForDate(date)}
          onDayHeaderClick={handleDayHeaderClick}
          onSaveDayNote={handleSaveDayNote}
          onDeleteDayNote={handleDeleteDayNote}
        />
      ))}
      {timeSlots.map((time) => (
        <React.Fragment key={`weekly-time-${time}`}>
          <div className="p-2 text-center border-b border-r bg-gray-50">
            {time}
          </div>
          {dates.map((date, dayIndex) => (
            <TimeCell
              key={`weekly-cell-${date.toISOString()}-${time}`}
              dayIndex={date.getDay()}
              time={time}
              cellKey={`weekly-cell-${date.toISOString()}-${time}`}
              scheduleSlots={scheduleSlots}
              handleSlotClick={handleSlotClick}
              handleEditSlot={handleEditSlot}
              handleDeleteSlot={handleDeleteSlot}
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default WeeklyGrid;
