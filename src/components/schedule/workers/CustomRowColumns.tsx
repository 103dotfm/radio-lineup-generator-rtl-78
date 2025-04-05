
import React, { useState, useEffect, useRef } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface CustomRowColumnsProps {
  rowId: string;
  values: Record<number, string>;
  onValueChange: (rowId: string, dayIndex: number, value: string) => void;
  onFocusCell: (rowId: string, dayIndex: number) => void;
  onBlurCell: (rowId: string, dayIndex: number) => void;
  onDelete: (rowId: string) => void;
}

const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({
  rowId,
  values,
  onValueChange,
  onFocusCell,
  onBlurCell,
  onDelete
}) => {
  // Local state to prevent UI freezing during edits
  const [localValues, setLocalValues] = useState<Record<number, string>>(values);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  
  // Update local values when props change
  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleLocalChange = (dayIndex: number, value: string) => {
    setLocalValues(prev => ({
      ...prev,
      [dayIndex]: value
    }));
    
    // Debounced update to parent to avoid excessive renders
    onValueChange(rowId, dayIndex, value);
  };
  
  return (
    <TableRow className="digital-custom-row">
      <TableCell className="p-2 border digital-custom-cell-delete">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onDelete(rowId)}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
      
      {/* Render cells in order from 0 to 5 for Sunday through Friday */}
      {[0, 1, 2, 3, 4, 5].map((dayIndex) => (
        <TableCell 
          key={`${rowId}-day-${dayIndex}`} 
          className={`p-2 border digital-custom-cell digital-custom-cell-${dayIndex}`}
        >
          <textarea 
            ref={el => {
              textareaRefs.current[dayIndex] = el;
            }}
            value={localValues[dayIndex] || ''}
            onChange={e => handleLocalChange(dayIndex, e.target.value)}
            onFocus={() => onFocusCell(rowId, dayIndex)}
            onBlur={() => {
              // Small delay to ensure we don't trigger state updates during React's commit phase
              setTimeout(() => {
                onBlurCell(rowId, dayIndex);
              }, 10);
            }}
            placeholder="הזן תוכן..."
            className="w-full h-full min-h-[60px] p-2 resize-none border rounded text-right bg-background"
            dir="rtl"
          />
        </TableCell>
      ))}
    </TableRow>
  );
};

export default CustomRowColumns;
