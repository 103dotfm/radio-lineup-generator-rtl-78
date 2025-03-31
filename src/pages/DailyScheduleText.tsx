
import React from 'react';
import { useParams } from 'react-router-dom';
import { parse, isValid } from 'date-fns';
import DailyTextSchedule from '@/components/schedule/DailyTextSchedule';

const DailyScheduleText = () => {
  const { date: dateParam } = useParams<{ date?: string }>();
  
  // Parse date from URL parameter if available
  const initialDate = dateParam 
    ? (() => {
        const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) ? parsedDate : new Date();
      })()
    : new Date();

  return (
    <div className="pt-4">
      <DailyTextSchedule initialDate={initialDate} />
    </div>
  );
};

export default DailyScheduleText;
