
import React from 'react';
import ScheduleView from './ScheduleView';

const MasterSchedule = () => {
  return (
    <div className="space-y-4">
      <div className="bg-yellow-100 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-bold mb-2">לוח שידורים ראשי</h2>
        <p>שינויים שנעשים כאן ישפיעו על כל השבועות העתידיות, אך לא על שבועות קודמות.</p>
      </div>
      <ScheduleView isAdmin isMasterSchedule />
    </div>
  );
};

export default MasterSchedule;
