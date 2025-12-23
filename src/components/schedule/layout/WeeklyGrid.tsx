import React from 'react';
import { ScheduleSlot, DayNote } from '@/types/schedule';
import TimeCell from './TimeCell';
import DayHeader from './DayHeader';
import BottomNotes from './BottomNotes';

interface WeeklyGridProps {
  dates: Date[];
  timeSlots: string[];
  scheduleSlots: ScheduleSlot[];
  weekDays: string[];
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleCreateSlot?: (dayIndex: number, time: string, duration?: number) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hideHeaderDates: boolean;
  editingNoteDate: Date | null;
  getNoteForDate: (date: Date) => DayNote | null;
  handleDayHeaderClick: (date: Date) => void;
  handleSaveDayNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  handleDeleteDayNote: (noteId: string) => Promise<void>;
  bottomNotes: DayNote[];
  editingBottomNoteDate: Date | null;
  handleBottomNoteAdd: (date: Date) => void;
  handleSaveBottomNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  handleDeleteBottomNote: (noteId: string) => Promise<void>;
  handleBottomNoteEdit: (date: Date) => void;
  isMasterSchedule?: boolean;
  deletingSlots?: Set<string>;
  isProducer?: boolean;
}

const WeeklyGrid: React.FC<WeeklyGridProps> = ({
  dates,
  timeSlots,
  scheduleSlots,
  weekDays,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  handleCreateSlot,
  isAdmin,
  isAuthenticated,
  hideHeaderDates,
  editingNoteDate,
  getNoteForDate,
  handleDayHeaderClick,
  handleSaveDayNote,
  handleDeleteDayNote,
  bottomNotes,
  editingBottomNoteDate,
  handleBottomNoteAdd,
  handleSaveBottomNote,
  handleDeleteBottomNote,
  handleBottomNoteEdit,
  isMasterSchedule = false,
  deletingSlots = new Set(),
  isProducer = false
}) => {
  return (
    <div className="grid grid-cols-[auto,repeat(7,1fr)] bg-white/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-200 premium-shadow" dir="rtl">
      <div className="p-4 font-bold text-center border-b border-l bg-slate-100/80 text-slate-600 text-xs uppercase tracking-widest">
        שעה
      </div>
      {dates.map((date, index) => (
        <DayHeader
          key={`header-${date.toISOString()}-${index}`}
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
      {timeSlots.map((time, timeIndex) => (
        <React.Fragment key={`weekly-time-${time}-${timeIndex}`}>
          <div className="p-3 text-center border-b border-l bg-slate-50/50 text-slate-500 font-medium text-sm">
            {time}
          </div>
          {dates.map((date, dayIndex) => {
            return (
              <TimeCell
                key={`weekly-cell-${date.toISOString()}-${time}-${dayIndex}-${timeIndex}`}
                dayIndex={date.getDay()}
                time={time}
                cellKey={`weekly-cell-${date.toISOString()}-${time}-${dayIndex}-${timeIndex}`}
                scheduleSlots={scheduleSlots}
                handleSlotClick={handleSlotClick}
                handleEditSlot={handleEditSlot}
                handleDeleteSlot={handleDeleteSlot}
                handleCreateSlot={handleCreateSlot}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                isMasterSchedule={isMasterSchedule}
                deletingSlots={deletingSlots}
              />
            );
          })}
        </React.Fragment>
      ))}

      {/* Bottom notes section - visible for admins and authenticated non-admin users (read-only for non-admins), not in master schedule */}
      {/* Hide bottom notes for unauthenticated users (public schedule page) */}
      {isAuthenticated && (isAdmin || isProducer) && !isMasterSchedule && (
        <BottomNotes
          dates={dates}
          bottomNotes={bottomNotes}
          editingBottomNoteDate={editingBottomNoteDate}
          onBottomNoteAdd={handleBottomNoteAdd}
          onSaveBottomNote={handleSaveBottomNote}
          onDeleteBottomNote={handleDeleteBottomNote}
          onBottomNoteEdit={handleBottomNoteEdit}
          readOnly={isProducer && !isAdmin}
        />
      )}
    </div>
  );
};

export default WeeklyGrid;
