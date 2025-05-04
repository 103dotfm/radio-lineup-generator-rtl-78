
import React, { useState } from 'react';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ScheduleSection = ({ isAdmin }: { isAdmin: boolean }) => {
  const [currentDate, setCurrentDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = direction === 'prev' ? subWeeks(prevDate, 1) : addWeeks(prevDate, 1);
      console.log(`Dashboard schedule navigating to ${direction} week:`, newDate);
      return newDate;
    });
  };
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">לוח שידורים שבועי</h2>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigateWeek('prev')}
          >
            <ChevronRight className="h-4 w-4 ml-1" />
            שבוע קודם
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigateWeek('next')}
          >
            שבוע הבא
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        </div>
      </div>
      
      <ScheduleView 
        selectedDate={currentDate} 
        isAdmin={isAdmin}
        hideDateControls={true} 
      />
    </div>
  );
};

export default ScheduleSection;
