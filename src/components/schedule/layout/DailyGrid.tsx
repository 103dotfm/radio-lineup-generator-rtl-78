
import React from 'react';
import { ScheduleSlot, DayNote } from '@/types/schedule';
import TimeCell from './TimeCell';
import DayHeader from './DayHeader';
import BottomNotes from './BottomNotes';

interface DailyGridProps {
  selectedDate: Date;
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
  bottomNotes: DayNote[];
  editingBottomNoteDate: Date | null;
  handleBottomNoteAdd: (date: Date) => void;
  handleSaveBottomNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  handleDeleteBottomNote: (noteId: string) => Promise<void>;
  handleBottomNoteEdit: (date: Date) => void;
}

const DailyGrid: React.FC<DailyGridProps> = ({
  selectedDate,
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
  handleDeleteDayNote,
  bottomNotes,
  editingBottomNoteDate,
  handleBottomNoteAdd,
  handleSaveBottomNote,
  handleDeleteBottomNote,
  handleBottomNoteEdit
}) => {
  return (
    <div className="grid grid-cols-[auto,1fr]" dir="rtl">
      <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
        שעה
      </div>
      <DayHeader
        date={selectedDate}
        weekDays={weekDays}
        hideHeaderDates={hideHeaderDates}
        isAdmin={isAdmin}
        editingNoteDate={editingNoteDate}
        dayNote={getNoteForDate(selectedDate)}
        onDayHeaderClick={handleDayHeaderClick}
        onSaveDayNote={handleSaveDayNote}
        onDeleteDayNote={handleDeleteDayNote}
      />
      {timeSlots.map((time, timeIndex) => (
        <React.Fragment key={`daily-${time}-${timeIndex}`}>
          <div className="p-2 text-center border-b border-r bg-gray-50">
            {time}
          </div>
          <TimeCell
            dayIndex={selectedDate.getDay()}
            time={time}
            cellKey={`daily-cell-${time}-${timeIndex}`}
            scheduleSlots={scheduleSlots}
            handleSlotClick={handleSlotClick}
            handleEditSlot={handleEditSlot}
            handleDeleteSlot={handleDeleteSlot}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
          />
        </React.Fragment>
      ))}

      {/* Bottom notes section - only visible for admins */}
      {isAdmin && (
        <BottomNotes
          dates={[selectedDate]}
          bottomNotes={bottomNotes} 
          editingBottomNoteDate={editingBottomNoteDate}
          onBottomNoteAdd={handleBottomNoteAdd}
          onSaveBottomNote={handleSaveBottomNote}
          onDeleteBottomNote={handleDeleteBottomNote}
          onBottomNoteEdit={handleBottomNoteEdit}
        />
      )}
    </div>
  );
};

export default DailyGrid;
