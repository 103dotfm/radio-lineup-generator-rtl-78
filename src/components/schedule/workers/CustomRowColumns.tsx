
import React from 'react';
import { TableCell } from "@/components/ui/table";

interface CustomRowColumnsProps {
  rowContents: Record<number, string>;
}

export const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({ rowContents }) => {
  // Create an array of 7 columns (0-6) to ensure proper alignment
  // Column 0 is for row label, 1-6 are for days of week
  const columns = [0, 1, 2, 3, 4, 5, 6];
  
  return (
    <>
      {columns.map((colIndex) => {
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
