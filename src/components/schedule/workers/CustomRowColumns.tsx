
import React from 'react';
import { TableCell } from "@/components/ui/table";

interface CustomRowColumnsProps {
  rowContents: Record<number, string>;
}

export const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({ rowContents }) => {
  // Create an array of 7 columns (0-6) to ensure proper alignment
  // Column 0 is for row label, 1-6 are for days of week (Sunday to Friday)
  
  return (
    <>
      <TableCell className="p-2 border text-center bg-gray-100 font-medium">
        {rowContents[0] || ''}
      </TableCell>
      <TableCell className="p-2 border text-center">
        {rowContents[1] || ''}
      </TableCell>
      <TableCell className="p-2 border text-center">
        {rowContents[2] || ''}
      </TableCell>
      <TableCell className="p-2 border text-center">
        {rowContents[3] || ''}
      </TableCell>
      <TableCell className="p-2 border text-center">
        {rowContents[4] || ''}
      </TableCell>
      <TableCell className="p-2 border text-center">
        {rowContents[5] || ''}
      </TableCell>
      <TableCell className="p-2 border text-center">
        {rowContents[6] || ''}
      </TableCell>
    </>
  );
};
