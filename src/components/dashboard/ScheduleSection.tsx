import React, { useState } from 'react';
import { ScheduleView } from '@/components/schedule/ScheduleView';

const ScheduleSection = ({ isAdmin }: { isAdmin: boolean }) => {
  const [currentDate] = useState<Date>(new Date());
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-semibold">לוח שידורים</h2>
      </div>
      
      <ScheduleView 
        selectedDate={currentDate} 
        isAdmin={isAdmin}
        hideDateControls={false}
        showAddButton={true}
      />
    </div>
  );
};

export default ScheduleSection;
