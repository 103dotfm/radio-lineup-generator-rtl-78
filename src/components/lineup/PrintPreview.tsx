
import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { ShowItem, Interviewee } from '@/types/show';

interface PrintPreviewProps {
  showName: string;
  showTime: string;
  showDate?: Date;
  items: Array<ShowItem & {
    interviewees?: Interviewee[];
  }>;
  editorContent: string;
  showMinutes?: boolean;
}

const PrintPreview = ({ showName, showTime, showDate, items, editorContent, showMinutes = false }: PrintPreviewProps) => {
  const { isAuthenticated } = useAuth();

  const calculateTotalMinutes = () => {
    return items.reduce((total, item) => total + (item.duration || 0), 0);
  };

  // Group items by dividers - each divider starts a new group
  const groupedItems = items.reduce((groups, item) => {
    if (item.is_divider) {
      // Start a new group with the divider
      groups.push([item]);
    } else if (groups.length === 0) {
      // First group if no dividers yet
      groups.push([item]);
    } else {
      // Add to current group
      groups[groups.length - 1].push(item);
    }
    return groups;
  }, [] as Array<Array<ShowItem & { interviewees?: Interviewee[] }>>);

  const formattedDate = showDate ? format(showDate, 'dd/MM/yyyy') : '';

  return (
    <div className="print-content bg-white p-2">
      <div className="flex flex-col items-center mb-2 print-header">
        <div className="text-center">
          <h1 className="text-xl font-bold">{showName}</h1>
          <h2 className="text-base text-gray-600">
            {showTime} {formattedDate}
          </h2>
        </div>
      </div>

      {/* Compact table for print */}
      <table className="w-full border-collapse border border-gray-200 print-table">
        <thead>
          <tr>
            <th className="py-1 px-2 text-right border border-gray-200 text-sm">שם</th>
            <th className="py-1 px-2 text-right border border-gray-200 text-sm">קרדיט</th>
            <th className="py-1 px-2 text-right border border-gray-200 text-sm">פרטים</th>
            {isAuthenticated && (
              <th className="py-1 px-2 text-right border border-gray-200 text-sm">טלפון</th>
            )}
            {showMinutes && (
              <th className="py-1 px-2 text-center border border-gray-200 text-sm w-14">דק'</th>
            )}
          </tr>
        </thead>
        <tbody>
          {groupedItems.map((group, groupIndex) => {
            // Check if the first item in this group is a divider
            const startsWithDivider = group[0]?.is_divider;
            
            return (
              <React.Fragment key={`print-group-${groupIndex}`}>
                {/* Render the divider as a special row with className for styling */}
                {startsWithDivider && (
                  <tr className="divider-row">
                    <td 
                      colSpan={isAuthenticated ? (showMinutes ? 5 : 4) : (showMinutes ? 4 : 3)} 
                      className="py-1 px-2 border-0 bg-gray-100"
                    >
                      <h2 className="divider-heading text-base font-bold">{group[0].name}</h2>
                    </td>
                  </tr>
                )}
                
                {/* Render the rest of the items in the group */}
                {group.slice(startsWithDivider ? 1 : 0).map((item) => {
                  // Calculate correct colspan based on authenticated status and showMinutes
                  const breakNoteColspan = isAuthenticated ? (showMinutes ? 5 : 4) : (showMinutes ? 4 : 3);
                  
                  if (item.is_break) {
                    return (
                      <tr key={item.id} className="breakRow bg-black/10">
                        <td colSpan={breakNoteColspan} className="py-1 px-2 text-center border border-gray-200 font-medium text-sm">
                          {item.name}
                        </td>
                      </tr>
                    );
                  }
                  
                  if (item.is_note) {
                    return (
                      <tr key={item.id} className="noteRow">
                        <td colSpan={breakNoteColspan} className="py-1 px-2 text-center border border-gray-200 text-black text-sm">
                          <div dangerouslySetInnerHTML={{ __html: item.details || '' }} />
                        </td>
                      </tr>
                    );
                  }

                  const intervieweeCount = item.interviewees?.length || 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="py-1 px-2 border border-gray-200 font-medium text-sm">
                          {item.name}
                        </td>
                        <td className="py-1 px-2 border border-gray-200 text-sm">
                          {item.title}
                        </td>
                        <td className="py-1 px-2 border border-gray-200 text-sm prose prose-sm max-w-none" 
                            rowSpan={intervieweeCount + 1}
                            dangerouslySetInnerHTML={{ __html: item.details }} />
                        {isAuthenticated && (
                          <td className="py-1 px-2 border border-gray-200 text-sm">
                            {item.phone}
                          </td>
                        )}
                        {showMinutes && (
                          <td className="py-1 px-2 text-center border border-gray-200 text-sm w-14"
                              rowSpan={intervieweeCount + 1}>
                            {item.duration}
                          </td>
                        )}
                      </tr>
                      {item.interviewees?.map((interviewee) => (
                        <tr key={interviewee.id}>
                          <td className="py-1 px-2 border border-gray-200 text-sm">
                            {interviewee.name}
                          </td>
                          <td className="py-1 px-2 border border-gray-200 text-sm">
                            {interviewee.title}
                          </td>
                          {isAuthenticated && (
                            <td className="py-1 px-2 border border-gray-200 text-sm">
                              {interviewee.phone}
                            </td>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        {showMinutes && (
          <tfoot>
            <tr>
              <td colSpan={isAuthenticated ? 4 : 3} className="py-1 px-2 text-right font-bold border border-gray-200 text-sm">
                סה״כ דקות
              </td>
              <td className="py-1 px-2 text-center font-bold border border-gray-200 w-14 text-sm">
                {calculateTotalMinutes()}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {editorContent && (
        <div 
          className="credits mt-4 pt-2 border-t border-gray-200 text-sm text-black text-center"
          dangerouslySetInnerHTML={{ __html: editorContent }}
        />
      )}
    </div>
  );
};

export default PrintPreview;
