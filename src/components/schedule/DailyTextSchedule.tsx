
import React, { useState } from 'react';
import { useDailySchedule } from '@/hooks/useDailySchedule';
import TextScheduleList from './TextScheduleList';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyTextScheduleProps {
  initialDate?: Date;
}

const DailyTextSchedule: React.FC<DailyTextScheduleProps> = ({ initialDate = new Date() }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { scheduleSlots, isLoading } = useDailySchedule(selectedDate);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setShowDatePicker(false);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">לוח שידורים יומי</h1>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateDay('prev')}>
            <ChevronRight className="h-4 w-4 ml-1" />
            יום קודם
          </Button>
          
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <CalendarIcon className="h-4 w-4 ml-1" />
                {format(selectedDate, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="sm" onClick={() => navigateDay('next')}>
            יום הבא
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
            הדפסה
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="w-full h-16" />
          ))}
        </div>
      ) : (
        <TextScheduleList slots={scheduleSlots} date={selectedDate} />
      )}

      <div className="print-footer text-center text-sm text-gray-500 mt-8 print:block hidden">
        הופק בתאריך: {format(new Date(), 'dd/MM/yyyy HH:mm')}
      </div>
    </div>
  );
};

export default DailyTextSchedule;
