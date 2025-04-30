
import React, { useRef } from 'react';
import { ScheduleView } from '@/components/schedule/ScheduleView';

const ScheduleSection = ({ isAdmin }: { isAdmin: boolean }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">לוח שידורים שבועי</h2>
      <ScheduleView selectedDate={new Date()} isAdmin={isAdmin} />
    </div>
  );
};

export default ScheduleSection;
