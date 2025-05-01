
import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Printer } from 'lucide-react';

interface WeekNavigationProps {
  weekStart: string;
  weekEnd: string;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onPrint: () => void;
}

export default function WeekNavigation({
  weekStart,
  weekEnd,
  onNavigateWeek,
  onPrint
}: WeekNavigationProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
      <div className="hidden md:flex items-center space-x-4 space-x-reverse md:mb-0 mb-2 text-center w-full md:w-auto">
        <Calendar className="h-5 w-5 ml-1" />
        <span>
          {weekStart} - {weekEnd}
        </span>
      </div>
      
      <div className="flex items-center space-x-2 space-x-reverse justify-center w-full md:w-auto">
        <Button variant="outline" size="sm" onClick={() => onNavigateWeek('prev')}>
          <ChevronRight className="h-4 w-4 ml-1" />
          שבוע קודם
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigateWeek('next')}>
          שבוע הבא
          <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPrint} 
          className="hidden md:flex items-center"
        >
          <Printer className="h-4 w-4 ml-1" />
          הדפסת הלוח
        </Button>
      </div>
    </div>
  );
}
