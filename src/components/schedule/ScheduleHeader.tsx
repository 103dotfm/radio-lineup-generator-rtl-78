
import React from 'react';
import { Calendar } from 'lucide-react';

interface ScheduleHeaderProps {
  weekStart: string;
  weekEnd: string;
}

export default function ScheduleHeader({ weekStart, weekEnd }: ScheduleHeaderProps) {
  return (
    <header className="mb-8">
      <div className="logo-container mx-auto md:mx-0 md:w-auto w-1/2">
        <img src="/storage/uploads/general/103fm-logo.png" alt="103fm" className="topLogo" />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-center md:text-right">לוח שידורים שבועי</h1>
      
      <div className="md:hidden flex justify-center mb-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 ml-1" />
          <span>
            {weekStart} - {weekEnd}
          </span>
        </div>
      </div>
    </header>
  );
}
