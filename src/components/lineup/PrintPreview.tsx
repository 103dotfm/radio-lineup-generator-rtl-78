
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

  return (
    <div className="print-content bg-white p-4">
      <div className="flex flex-col items-center mb-4">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-16" />
        <div className="text-center mt-2">
          <h1 className="text-2xl font-bold showName">{showName}</h1>
          <h2 className="text-lg text-gray-600">
            {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
          </h2>
        </div>
      </div>

      {/* Unified table approach with dividers as headings */}
      <table className="w-full border-collapse border border-gray-200 mb-4">
        <thead>
          <tr>
            <th className="py-2 px-4 text-right border border-gray-200 text-base">שם</th>
            <th className="py-2 px-4 text-right border border-gray-200 text-base">קרדיט</th>
            <th className="py-2 px-4 text-right border border-gray-200 text-base">פרטים</th>
            {isAuthenticated && (
              <th className="py-2 px-4 text-right border border-gray-200 text-base">טלפון</th>
            )}
            {showMinutes && (
              <th className="py-2 px-4 text-center border border-gray-200 text-base w-20">דק'</th>
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
                      className="py-2 px-4 border-0"
                    >
                      <h2 className="divider-heading text-xl font-bold">{group[0].name}</h2>
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
                        <td colSpan={breakNoteColspan} className="py-3 px-4 text-center border border-gray-200 font-medium text-base">
                          {item.name}
                        </td>
                      </tr>
                    );
                  }
                  
                  if (item.is_note) {
                    return (
                      <tr key={item.id} className="noteRow">
                        <td colSpan={breakNoteColspan} className="py-3 px-4 text-center border border-gray-200 text-black text-base">
                          <div dangerouslySetInnerHTML={{ __html: item.details || '' }} />
                        </td>
                      </tr>
                    );
                  }

                  const intervieweeCount = item.interviewees?.length || 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="py-3 px-4 border border-gray-200 font-medium text-base">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 border border-gray-200 text-base">
                          {item.title}
                        </td>
                        <td className="py-3 px-4 border border-gray-200 text-base prose prose-sm max-w-none" 
                            rowSpan={intervieweeCount + 1}
                            dangerouslySetInnerHTML={{ __html: item.details }} />
                        {isAuthenticated && (
                          <td className="py-3 px-4 border border-gray-200 text-base">
                            {item.phone}
                          </td>
                        )}
                        {showMinutes && (
                          <td className="py-3 px-4 text-center border border-gray-200 text-base w-20"
                              rowSpan={intervieweeCount + 1}>
                            {item.duration}
                          </td>
                        )}
                      </tr>
                      {item.interviewees?.map((interviewee) => (
                        <tr key={interviewee.id}>
                          <td className="py-3 px-4 border border-gray-200 text-base">
                            {interviewee.name}
                          </td>
                          <td className="py-3 px-4 border border-gray-200 text-base">
                            {interviewee.title}
                          </td>
                          {isAuthenticated && (
                            <td className="py-3 px-4 border border-gray-200 text-base">
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
              <td colSpan={isAuthenticated ? 4 : 3} className="py-2 px-4 text-right font-bold border border-gray-200">
                סה״כ דקות
              </td>
              <td className="py-2 px-4 text-center font-bold border border-gray-200 w-20">
                {calculateTotalMinutes()}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {editorContent && (
        <div 
          className="credits mt-8 pt-4 border-t border-gray-200 text-base text-black text-center"
          dangerouslySetInnerHTML={{ __html: editorContent }}
        />
      )}
    </div>
  );
};

export default PrintPreview;
