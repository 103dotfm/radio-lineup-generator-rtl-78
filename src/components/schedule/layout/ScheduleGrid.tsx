import React, { useMemo, useState } from 'react';
import { format, startOfWeek, addDays, startOfMonth, getDaysInMonth, isSameMonth, addWeeks, isToday } from 'date-fns';
import { ViewMode, ScheduleSlot, DayNote } from '@/types/schedule';
import { FileCheck, Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getShowDisplay } from '@/utils/showDisplay';
import ScheduleGridCell from './ScheduleGridCell';
import DayNoteComponent from './DayNote';
import { createDayNote, updateDayNote, deleteDayNote } from '@/lib/supabase/dayNotes';

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
  onDayNoteChange: () => void;
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
  onDayNoteChange
}: ScheduleGridProps) {
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const [editingNoteDate, setEditingNoteDate] = useState<Date | null>(null);

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

  const handleSaveDayNote = async (date: Date, noteText: string, noteId?: string) => {
    try {
      if (noteId) {
        await updateDayNote(noteId, noteText);
      } else {
        await createDayNote(date, noteText);
      }
      onDayNoteChange();
      setEditingNoteDate(null);
    } catch (error) {
      console.error('Error saving day note:', error);
    }
  };

  const handleDeleteDayNote = async (noteId: string) => {
    try {
      await deleteDayNote(noteId);
      onDayNoteChange();
    } catch (error) {
      console.error('Error deleting day note:', error);
    }
  };

  const getNoteForDate = (date: Date): DayNote | null => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return dayNotes.find(note => note.date === formattedDate) || null;
  };

  const handleDayHeaderClick = (date: Date) => {
    if (isAdmin) {
      setEditingNoteDate(date);
    }
  };

  const renderTimeCell = (dayIndex: number, time: string, isCurrentMonth: boolean = true) => {
    const relevantSlots = scheduleSlots.filter(
      slot => slot.day_of_week === dayIndex && isSlotStartTime(slot, time)
    );
    
    return (
      <div className={`relative p-2 border-b border-r last:border-r-0 min-h-[60px] ${!isCurrentMonth ? 'bg-gray-50' : ''}`}>
        {isCurrentMonth && relevantSlots.map(slot => (
          <ScheduleGridCell 
            key={slot.id}
            slot={slot}
            handleSlotClick={handleSlotClick}
            handleEditSlot={handleEditSlot}
            handleDeleteSlot={handleDeleteSlot}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    );
  };

  const isSlotStartTime = (slot: ScheduleSlot, timeSlot: string) => {
    const slotStartMinutes = timeToMinutes(slot.start_time);
    const currentTimeMinutes = timeToMinutes(timeSlot);
    return slotStartMinutes === currentTimeMinutes;
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const renderDayHeader = (date: Date, index: number) => {
    const dayNote = getNoteForDate(date);
    const isCurrentlyEditing = editingNoteDate && 
      editingNoteDate.getTime() === date.getTime();
    const todayClass = isToday(date) ? 'bg-[#59c9c6]' : 'bg-gray-100';
    
    return (
      <div 
        key={index} 
        className={`p-2 font-bold text-center border-b border-r last:border-r-0 ${todayClass} group cursor-pointer`}
        onClick={() => handleDayHeaderClick(date)}
      >
        {weekDays[date.getDay()]}
        {!hideHeaderDates && (
          <>
            <div className="text-sm text-gray-600">
              {format(date, 'dd/MM')}
            </div>
            <DayNoteComponent
              note={dayNote}
              date={date}
              onSave={handleSaveDayNote}
              onDelete={handleDeleteDayNote}
              isAdmin={isAdmin}
            />
          </>
        )}
      </div>
    );
  };

  const renderGrid = () => {
    switch (viewMode) {
      case 'daily':
        return (
          <div className="grid grid-cols-[auto,1fr]" dir="rtl">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {renderDayHeader(selectedDate, 0)}
            {timeSlots.map(time => (
              <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {renderTimeCell(selectedDate.getDay(), time)}
              </React.Fragment>
            ))}
          </div>
        );
        
      case 'weekly':
        return (
          <div className="grid grid-cols-[auto,repeat(7,1fr)]" dir="rtl">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {dates.map((date, index) => renderDayHeader(date, index))}
            {timeSlots.map(time => (
              <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {Array.from({length: 7}).map((_, dayIndex) => (
                  <React.Fragment key={`${time}-${dayIndex}`}>
                    {renderTimeCell(dayIndex, time)}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        );
        
      case 'monthly':
        return (
          <div className="grid grid-cols-[auto,repeat(7,1fr)]" dir="rtl">
            <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
              שעה
            </div>
            {weekDays.map(day => (
              <div key={day} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
                {day}
              </div>
            ))}
            {timeSlots.map(time => (
              <React.Fragment key={time}>
                <div className="p-2 text-center border-b border-r bg-gray-50">
                  {time}
                </div>
                {weekDays.map((_, dayIndex) => {
                  const relevantDates = dates.filter(date => date.getDay() === dayIndex);
                  const isCurrentMonth = relevantDates.length > 0;
                  return renderTimeCell(dayIndex, time, isCurrentMonth);
                })}
              </React.Fragment>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {renderGrid()}
    </div>
  );
}
