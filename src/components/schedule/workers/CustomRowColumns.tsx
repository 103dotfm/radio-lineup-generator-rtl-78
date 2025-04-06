
import React from "react";
import { TableCell } from "@/components/ui/table";

interface CustomRowColumnsProps {
  rowContents: Record<number, string>;
}

export const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({ rowContents }) => {
  // Create an array of 6 days (0-5)
  const days = Array.from({ length: 6 }, (_, i) => i);
  
  return (
    <>
      {days.map((day) => (
        <TableCell key={`day-${day}`} className="p-2 border text-center">
          {rowContents[day] || ""}
        </TableCell>
      ))}
    </>
  );
};
