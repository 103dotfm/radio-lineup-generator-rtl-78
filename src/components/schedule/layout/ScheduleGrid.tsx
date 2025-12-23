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
  handleCreateSlot?: (dayIndex: number, time: string, duration?: number) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hideHeaderDates: boolean;
  dayNotes: DayNote[];
  bottomNotes: DayNote[];
  onDayNoteChange: () => void;
  onBottomNoteChange: () => void;
  isMasterSchedule?: boolean;
  deletingSlots?: Set<string>;
  isProducer?: boolean;
}

export default function ScheduleGrid({
  scheduleSlots,
  selectedDate,
  viewMode,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  handleCreateSlot,
  isAdmin,
  isAuthenticated,
  hideHeaderDates,
  dayNotes,
  bottomNotes,
  onDayNoteChange,
  onBottomNoteChange,
  isMasterSchedule = false,
  deletingSlots = new Set(),
  isProducer = false
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
            isMasterSchedule={isMasterSchedule}
            deletingSlots={deletingSlots}
            isProducer={isProducer}
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
            handleCreateSlot={handleCreateSlot}
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
            isMasterSchedule={isMasterSchedule}
            deletingSlots={deletingSlots}
            isProducer={isProducer}
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
            isMasterSchedule={isMasterSchedule}
            deletingSlots={deletingSlots}
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
