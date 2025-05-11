
import React from 'react';
import { format, isToday } from 'date-fns';
import { DayNote } from '@/types/schedule';
import DayNoteComponent from './DayNote';

interface DayHeaderProps {
  date: Date;
  weekDays: string[];
  hideHeaderDates: boolean;
  isAdmin: boolean;
  editingNoteDate: Date | null;
  dayNote: DayNote | null;
  onDayHeaderClick: (date: Date) => void;
  onSaveDayNote: (date: Date, noteText: string, noteId?: string) => Promise<void>;
  onDeleteDayNote: (noteId: string) => Promise<void>;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  date,
  weekDays,
  hideHeaderDates,
  isAdmin,
  editingNoteDate,
  dayNote,
  onDayHeaderClick,
  onSaveDayNote,
  onDeleteDayNote
}) => {
  const isCurrentlyEditing = editingNoteDate && 
    editingNoteDate.getTime() === date.getTime();
  const todayClass = isToday(date) ? 'bg-[#59c9c6]' : 'bg-gray-100';
  
  return (
    <div 
      className={`p-2 font-bold text-center border-b border-r last:border-r-0 ${todayClass} group cursor-pointer`}
      onClick={() => onDayHeaderClick(date)}
    >
      {weekDays[date.getDay()]}
      {!hideHeaderDates && (
        <>
          <div className="text-sm text-gray-600">
            {format(date, 'dd/MM')}
          </div>
          <DayNoteComponent
            note={isCurrentlyEditing ? 
              (dayNote || { 
                id: '', 
                date: format(date, 'yyyy-MM-dd'), 
                note: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString() 
              }) : dayNote}
            date={date}
            onSave={onSaveDayNote}
            onDelete={onDeleteDayNote}
            isAdmin={isAdmin}
            isEditing={isCurrentlyEditing}
          />
        </>
      )}
    </div>
  );
};

export default DayHeader;
