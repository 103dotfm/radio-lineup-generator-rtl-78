
import React from 'react';
import { cn } from "@/lib/utils";

interface LineupTableHeaderProps {
  isAuthenticated: boolean;
  showMinutes: boolean;
}

const LineupTableHeader: React.FC<LineupTableHeaderProps> = ({
  isAuthenticated,
  showMinutes
}) => {
  const cellClass = "py-4 px-4 text-right font-black text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm first:rounded-tr-2xl last:rounded-tl-2xl";

  return (
    <thead className="relative z-10">
      <tr>
        <th className={cellClass}>שם</th>
        <th className={cellClass}>קרדיט</th>
        <th className={cellClass}>פרטים</th>
        {isAuthenticated && <th className={cellClass}>טלפון</th>}
        {showMinutes && <th className={cn(cellClass, "text-center")}>דק'</th>}
        <th className={cn(cellClass, "text-center")}>פעולות</th>
      </tr>
    </thead>
  );
};

export default LineupTableHeader;
