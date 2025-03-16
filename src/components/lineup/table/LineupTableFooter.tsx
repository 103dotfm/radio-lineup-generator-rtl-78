
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
    <tfoot>
      <tr>
        <td colSpan={isAuthenticated ? 4 : 3} className="py-1 sm:py-2 px-2 sm:px-4 text-right font-bold border border-gray-200 text-xs sm:text-sm">
          סה״כ דקות
        </td>
        <td className="py-1 sm:py-2 px-1 sm:px-4 text-center font-bold border border-gray-200 text-xs sm:text-sm">
          {totalMinutes}
        </td>
        <td className="py-1 sm:py-2 px-1 sm:px-4 border border-gray-200"></td>
      </tr>
    </tfoot>
  );
};

export default LineupTableFooter;
