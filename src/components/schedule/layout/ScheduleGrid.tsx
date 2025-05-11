
import React from 'react';
import { ViewMode, ScheduleSlot, DayNote } from '@/types/schedule';
import { timeSlotsList, calculateDates } from '../utils/timeUtils';
import { useDayNotesHandlers } from '../hooks/useDayNotesHandlers';
import { useBottomNotes } from '../hooks/useBottomNotes';
import DailyGrid from './DailyGrid';
import WeeklyGrid from './WeeklyGrid';
import MonthlyGrid from './MonthlyGrid';

interface ScheduleGridProps {
  scheduleSlots: ScheduleSlot[];
  selectedDate: Date;
  viewMode: ViewMode;
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hideHeaderDates: boolean;
  dayNotes: DayNote[];
  bottomNotes: DayNote[];
  onDayNoteChange: () => void;
  onBottomNoteChange: () => void;
}

export default function ScheduleGrid({
  scheduleSlots,
  selectedDate,
  viewMode,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated,
  hideHeaderDates,
  dayNotes,
  bottomNotes,
  onDayNoteChange,
  onBottomNoteChange
}: ScheduleGridProps) {
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const timeSlots = timeSlotsList();
  const dates = calculateDates(selectedDate, viewMode);

  // Handlers for top notes
  const {
    editingNoteDate,
    handleSaveDayNote,
    handleDeleteDayNote,
    getNoteForDate,
    handleDayHeaderClick
  } = useDayNotesHandlers(dayNotes, onDayNoteChange);

  // Handlers for bottom notes
  const {
    editingBottomNoteDate,
    handleSaveBottomNote,
    handleDeleteBottomNote,
    handleBottomNoteAdd,
    handleBottomNoteEdit
  } = useBottomNotes(bottomNotes, onBottomNoteChange);

  const renderGrid = () => {
    switch (viewMode) {
      case 'daily':
        return (
          <DailyGrid
            selectedDate={selectedDate}
            timeSlots={timeSlots}
            scheduleSlots={scheduleSlots}
            weekDays={weekDays}
            handleSlotClick={handleSlotClick}
            handleEditSlot={handleEditSlot}
            handleDeleteSlot={handleDeleteSlot}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
            hideHeaderDates={hideHeaderDates}
            editingNoteDate={editingNoteDate}
            getNoteForDate={getNoteForDate}
            handleDayHeaderClick={handleDayHeaderClick}
            handleSaveDayNote={handleSaveDayNote}
            handleDeleteDayNote={handleDeleteDayNote}
            bottomNotes={bottomNotes}
            editingBottomNoteDate={editingBottomNoteDate}
            handleBottomNoteAdd={handleBottomNoteAdd}
            handleSaveBottomNote={handleSaveBottomNote}
            handleDeleteBottomNote={handleDeleteBottomNote}
            handleBottomNoteEdit={handleBottomNoteEdit}
          />
        );
        
      case 'weekly':
        return (
          <WeeklyGrid
            dates={dates}
            timeSlots={timeSlots}
            scheduleSlots={scheduleSlots}
            weekDays={weekDays}
            handleSlotClick={handleSlotClick}
            handleEditSlot={handleEditSlot}
            handleDeleteSlot={handleDeleteSlot}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
            hideHeaderDates={hideHeaderDates}
            editingNoteDate={editingNoteDate}
            getNoteForDate={getNoteForDate}
            handleDayHeaderClick={handleDayHeaderClick}
            handleSaveDayNote={handleSaveDayNote}
            handleDeleteDayNote={handleDeleteDayNote}
            bottomNotes={bottomNotes}
            editingBottomNoteDate={editingBottomNoteDate}
            handleBottomNoteAdd={handleBottomNoteAdd}
            handleSaveBottomNote={handleSaveBottomNote}
            handleDeleteBottomNote={handleDeleteBottomNote}
            handleBottomNoteEdit={handleBottomNoteEdit}
          />
        );
        
      case 'monthly':
        return (
          <MonthlyGrid
            timeSlots={timeSlots}
            scheduleSlots={scheduleSlots}
            weekDays={weekDays}
            handleSlotClick={handleSlotClick}
            handleEditSlot={handleEditSlot}
            handleDeleteSlot={handleDeleteSlot}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
            dates={dates}
          />
        );
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {renderGrid()}
    </div>
  );
}
