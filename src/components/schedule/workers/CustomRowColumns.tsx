
import React from 'react';
import { TableCell } from "@/components/ui/table";

interface CustomRowColumnsProps {
  rowContents: Record<number, string>;
  section?: string;
}

export const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({ 
  rowContents,
  section = "default" 
}) => {
  // Create columns 1-6 for days of week (Sunday to Friday)
  // No longer need column 0 for row label
  
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((day) => (
        <TableCell 
          key={`day-${day}`} 
          className={`p-2 border text-center digital-cell digital-cell-${section}`}
        >
          {rowContents[day] || ''}
        </TableCell>
      ))}
    </>
  );
};
