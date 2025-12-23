import React from 'react';
import { ScheduleSlot, DayNote } from '@/types/schedule';
import TimeCell from './TimeCell';

interface MonthlyGridProps {
  timeSlots: string[];
  scheduleSlots: ScheduleSlot[];
  weekDays: string[];
  handleSlotClick: (slot: ScheduleSlot) => void;
  handleEditSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  handleDeleteSlot: (slot: ScheduleSlot, e: React.MouseEvent) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  dates: Date[];
  isMasterSchedule?: boolean;
  deletingSlots?: Set<string>;
}

const MonthlyGrid: React.FC<MonthlyGridProps> = ({
  timeSlots,
  scheduleSlots,
  weekDays,
  handleSlotClick,
  handleEditSlot,
  handleDeleteSlot,
  isAdmin,
  isAuthenticated,
  dates,
  isMasterSchedule = false,
  deletingSlots = new Set()
}) => {
  return (
    <div className="grid grid-cols-[auto,repeat(7,1fr)]" dir="rtl">
      <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
        שעה
      </div>
      {weekDays.map((day, index) => (
        <div key={`monthly-header-${day}-${index}`} className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100">
          {day}
        </div>
      ))}
      {timeSlots.map((time, timeIndex) => (
        <React.Fragment key={`monthly-${time}-${timeIndex}`}>
          <div className="p-2 text-center border-b border-r bg-gray-50">
            {time}
          </div>
          {weekDays.map((_, dayIndex) => {
            const relevantDates = dates.filter(date => date.getDay() === dayIndex);
            const isCurrentMonth = relevantDates.length > 0;
            return (
              <TimeCell
                key={`monthly-cell-${time}-${dayIndex}-${timeIndex}`}
                dayIndex={dayIndex}
                time={time}
                isCurrentMonth={isCurrentMonth}
                cellKey={`monthly-cell-${time}-${dayIndex}-${timeIndex}`}
                scheduleSlots={scheduleSlots}
                handleSlotClick={handleSlotClick}
                handleEditSlot={handleEditSlot}
                handleDeleteSlot={handleDeleteSlot}
                isAdmin={isAdmin}
                isAuthenticated={isAuthenticated}
                isMasterSchedule={isMasterSchedule}
                deletingSlots={deletingSlots}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default MonthlyGrid;
