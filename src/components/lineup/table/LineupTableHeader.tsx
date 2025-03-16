
import React from 'react';

interface LineupTableHeaderProps {
  isAuthenticated: boolean;
  showMinutes: boolean;
}

const LineupTableHeader: React.FC<LineupTableHeaderProps> = ({
  isAuthenticated,
  showMinutes
}) => {
  return (
    <thead>
      <tr>
        <th className="py-1 sm:py-2 px-2 sm:px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200 text-xs sm:text-sm">שם</th>
        <th className="py-1 sm:py-2 px-2 sm:px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200 text-xs sm:text-sm">קרדיט</th>
        <th className="py-1 sm:py-2 px-2 sm:px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200 text-xs sm:text-sm">פרטים</th>
        {isAuthenticated && <th className="py-1 sm:py-2 px-2 sm:px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200 text-xs sm:text-sm">טלפון</th>}
        {showMinutes && <th className="py-1 sm:py-2 px-1 sm:px-4 text-center border font-bold bg-slate-300 hover:bg-slate-200 text-xs sm:text-sm">דק'</th>}
        <th className="py-1 sm:py-2 px-1 sm:px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200 text-xs sm:text-sm">פעולות</th>
      </tr>
    </thead>
  );
};

export default LineupTableHeader;
