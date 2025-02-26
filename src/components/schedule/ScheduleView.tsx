
import React, { useState } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewMode } from '@/types/schedule';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleViewProps {
  isAdmin?: boolean;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ isAdmin = false }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const timeSlots = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );

  const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : 30;
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - days);
    } else {
      newDate.setDate(newDate.getDate() + days);
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('prev')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('next')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={viewMode}
          onValueChange={(value: ViewMode) => setViewMode(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">יומי</SelectItem>
            <SelectItem value="weekly">שבועי</SelectItem>
            <SelectItem value="monthly">חודשי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showDatePicker && (
        <div className="absolute z-50 bg-white border rounded-md shadow-lg p-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setShowDatePicker(false);
              }
            }}
            locale={he}
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[auto,repeat(7,1fr)]">
          {/* Time column header */}
          <div className="p-2 font-bold text-center border-b border-r bg-gray-100">
            שעה
          </div>
          
          {/* Days headers */}
          {weekDates.map((date, index) => (
            <div
              key={index}
              className="p-2 font-bold text-center border-b border-r last:border-r-0 bg-gray-100"
            >
              {weekDays[index]}
              <div className="text-sm text-gray-600">
                {format(date, 'dd/MM')}
              </div>
            </div>
          ))}

          {/* Time slots */}
          {timeSlots.map((time) => (
            <React.Fragment key={time}>
              {/* Time column */}
              <div className="p-2 text-center border-b border-r last:border-b-0 bg-gray-50">
                {time}
              </div>
              
              {/* Days columns */}
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div
                  key={`${time}-${dayIndex}`}
                  className="p-2 border-b border-r last:border-r-0 last:border-b-0 min-h-[60px]"
                >
                  {/* Placeholder for schedule items */}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
