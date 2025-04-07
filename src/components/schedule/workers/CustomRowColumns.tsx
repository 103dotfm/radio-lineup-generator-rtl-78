
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
  // Create columns 0-5 for days of week (Sunday to Friday)
  // This matches the day indices in the main component
  
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((day) => (
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
