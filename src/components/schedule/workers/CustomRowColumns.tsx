
import React from 'react';
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomRowColumnsProps {
  rowContents: Record<number, string>;
  section?: string;
  editable?: boolean;
  onContentChange?: (dayIndex: number, content: string) => void;
  onBlur?: (dayIndex: number) => void;
  onFocus?: (dayIndex: number) => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const CustomRowColumns: React.FC<CustomRowColumnsProps> = ({ 
  rowContents,
  section = "default",
  editable = false,
  onContentChange,
  onBlur,
  onFocus,
  showActions = false,
  onEdit,
  onDelete
}) => {
  // Create columns 0-5 for days of week (Sunday to Friday)
  
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((day) => (
        <TableCell 
          key={`day-${day}`} 
          className={`p-2 border text-center digital-cell digital-cell-${section}`}
        >
          {editable ? (
            <div className="relative min-h-[60px]">
              <textarea
                value={rowContents[day] || ''}
                onChange={(e) => onContentChange?.(day, e.target.value)}
                onFocus={() => onFocus?.(day)}
                onBlur={() => onBlur?.(day)}
                className="w-full h-full min-h-[60px] p-2 resize-none border rounded bg-background"
                placeholder="הזן טקסט..."
              />
              
              {showActions && day === 0 && (
                <div className="absolute top-1 right-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border border-border">
                      {onEdit && (
                        <DropdownMenuItem onClick={onEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          ערוך
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem onClick={onDelete}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          מחק
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ) : (
            <div className="digital-custom-cell-content">
              {rowContents[day] || ''}
            </div>
          )}
        </TableCell>
      ))}
    </>
  );
};
