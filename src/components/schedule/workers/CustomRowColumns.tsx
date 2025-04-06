
import React from 'react';
import { TableCell } from "@/components/ui/table";

interface CustomRowColumnsProps {
  rowContents: Record<number, string>;
}

export const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({ rowContents }) => {
  // Create an array of 7 columns (0-6) to ensure proper alignment
  // Column 0 is for row label, 1-6 are for days of week (Sunday to Friday)
  const columns = [0, 1, 2, 3, 4, 5, 6];
  
  return (
    <>
      {columns.map((colIndex) => {
        // For each column, render the cell with the corresponding content
        // If no content exists for this column, render an empty string
        const content = rowContents[colIndex] || '';
        
        return (
          <TableCell key={`col-${colIndex}`} className="p-2 border text-center">
            {content}
          </TableCell>
        );
      })}
    </>
  );
};
