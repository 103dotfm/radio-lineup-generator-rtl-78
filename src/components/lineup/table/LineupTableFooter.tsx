
import React from 'react';

interface LineupTableFooterProps {
  isAuthenticated: boolean;
  totalMinutes: number;
}

const LineupTableFooter: React.FC<LineupTableFooterProps> = ({
  isAuthenticated,
  totalMinutes
}) => {
  return (
    <tfoot className="bg-slate-50/80 backdrop-blur-md">
      <tr>
        <td colSpan={isAuthenticated ? 4 : 3} className="py-4 px-6 text-right font-black text-slate-800 text-lg rounded-br-2xl border-t border-slate-200">
          סה״כ דקות
        </td>
        <td className="py-4 px-4 text-center font-black text-primary text-xl border-t border-slate-200">
          {totalMinutes}
        </td>
        <td className="py-4 px-4 rounded-bl-2xl border-t border-slate-200"></td>
      </tr>
    </tfoot>
  );
};

export default LineupTableFooter;
