
import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { ShowItem, Interviewee } from '@/types/show';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface PrintPreviewProps {
  showName: string;
  showTime: string;
  showDate?: Date;
  items: Array<ShowItem & {
    interviewees?: Interviewee[];
  }>;
  editorContent: string;
  showMinutes?: boolean;
  isPdfExport?: boolean;
}

const PrintPreview = ({ 
  showName, 
  showTime, 
  showDate, 
  items, 
  editorContent, 
  showMinutes = false,
  isPdfExport = false 
}: PrintPreviewProps) => {
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

  const containerClassName = isPdfExport 
    ? "print-content lineup-pdf-export" 
    : "print-content bg-white p-4";

  return (
    <div className={containerClassName}>
      <div className="flex flex-col items-center mb-4">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-12" />
        <div className="text-center mt-2">
          <h1 className="text-2xl font-bold showName showNamePrint">{showName}</h1>
          <h2 className="text-lg text-gray-600 mt-1 showTimePrint">
            {showTime} // {showDate ? format(showDate, 'dd.MM.yyyy') : ''}
          </h2>
        </div>
      </div>

      {/* Unified table approach with dividers as headings */}
      <Table className="w-full border-collapse border border-gray-200 mb-6 print-safe-table">
        <TableHeader>
          <TableRow>
            <TableHead className="py-2 px-4 text-right border border-gray-200 text-base col-print-name">מרואיינ/ת</TableHead>
            <TableHead className="py-2 px-4 text-right border border-gray-200 text-base col-print-details">פרטים</TableHead>
            {isAuthenticated && (
              <TableHead className="py-2 px-4 text-right border border-gray-200 text-base col-print-phone">טלפון</TableHead>
            )}
            {showMinutes && (
              <TableHead className="py-2 px-4 text-center border border-gray-200 text-base col-print-minutes">דק'</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="print-safe-body">
          {groupedItems.map((group, groupIndex) => {
            // Check if the first item in this group is a divider
            const startsWithDivider = group[0]?.is_divider;
            
            return (
              <React.Fragment key={`print-group-${groupIndex}`}>
                {/* Render the divider as a special row with className for styling */}
                {startsWithDivider && (
                  <TableRow className="divider-row print-avoid-break">
                    <TableCell 
                      colSpan={isAuthenticated ? (showMinutes ? 5 : 4) : (showMinutes ? 4 : 3)} 
                      className="py-0 print-divider-cell"
                    >
                      <h2 className="divider-heading text-xl font-bold mt-10 mb-4">{group[0].name}</h2>
                    </TableCell>
                  </TableRow>
                )}
                
                {/* Render the rest of the items in the group */}
                {group.slice(startsWithDivider ? 1 : 0).map((item) => {
                  // Calculate correct colspan based on authenticated status and showMinutes
                  const breakNoteColspan = isAuthenticated ? (showMinutes ? 5 : 4) : (showMinutes ? 4 : 3);
                  
                  if (item.is_break) {
                    return (
                      <TableRow key={item.id} className="breakRow bg-black/10 print-avoid-break">
                        <TableCell colSpan={breakNoteColspan} className="py-3 px-4 text-center border border-gray-200 font-medium text-base">
                          {item.name}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  if (item.is_note) {
                    return (
                      <TableRow key={item.id} className="noteRow print-avoid-break">
                        <TableCell colSpan={breakNoteColspan} className="py-3 px-4 text-center border border-gray-200 text-black text-base">
                          <div dangerouslySetInnerHTML={{ __html: item.details || '' }} />
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const intervieweeCount = item.interviewees?.length || 0;

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="print-avoid-break item-row">
                        <TableCell className="py-3 px-4 border border-gray-200 font-medium text-base col-print-name">
                          <strong>{item.name}</strong><br />{item.title}
                        </TableCell>
                        <TableCell 
                          className="py-3 px-4 border border-gray-200 details-column prose prose-sm max-w-none col-print-details" 
                          rowSpan={intervieweeCount + 1}
                          dangerouslySetInnerHTML={{ __html: item.details }} 
                        />
                        {isAuthenticated && (
                          <TableCell className="py-3 px-4 border border-gray-200 text-base whitespace-nowrap col-print-phone">
                            {item.phone}
                          </TableCell>
                        )}
                        {showMinutes && (
                          <TableCell 
                            className="py-3 px-4 text-center border border-gray-200 text-base col-print-minutes"
                            rowSpan={intervieweeCount + 1}
                          >
                            {item.duration}
                          </TableCell>
                        )}
                      </TableRow>
                      {item.interviewees?.map((interviewee) => (
                        <TableRow key={interviewee.id} className="print-avoid-break interviewee-row">
                          <TableCell className="py-3 px-4 border border-gray-200 text-base col-print-name">
                            <strong>{interviewee.name}</strong><br />{interviewee.title}
                          </TableCell>
                          {isAuthenticated && (
                            <TableCell className="py-3 px-4 border border-gray-200 text-base whitespace-nowrap col-print-phone">
                              {interviewee.phone}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TableBody>
        {showMinutes && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={isAuthenticated ? 4 : 3} className="py-2 px-4 text-right font-bold border border-gray-200">
                סה״כ דקות
              </TableCell>
              <TableCell className="py-2 px-4 text-center font-bold border border-gray-200 col-print-minutes">
                {calculateTotalMinutes()}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {editorContent && (
        <div 
          className="credits mt-8 pt-4 border-t border-gray-200 text-base text-black text-center print-avoid-break"
          dangerouslySetInnerHTML={{ __html: editorContent }}
        />
      )}
    </div>
  );
};

export default PrintPreview;
