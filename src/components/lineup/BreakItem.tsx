
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, GripVertical } from "lucide-react";

interface BreakItemProps {
  id: string;
  name: string;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onBreakTextChange: (id: string, text: string) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
}

const BreakItem = ({
  id,
  name,
  duration,
  onDelete,
  onDurationChange,
  onBreakTextChange,
  isAuthenticated,
  showMinutes = false,
}: BreakItemProps) => {
  // When minutes are not showing, we want the text area to span all columns except the actions column
  const mainColspan = isAuthenticated ? 3 : 2; // name, title, details (and phone if authenticated)
  const actionsColspan = 1;
  
  return (
    <>
      {showMinutes ? (
        // With minutes column visible
        <>
          <td colSpan="4" className="py-2 px-4 border border-gray-200 bg-black/10">
            <Input
              value={name}
              onChange={(e) => onBreakTextChange(id, e.target.value)}
              className="w-full text-center border-0 bg-transparent font-medium text-base"
            />
          </td>
          <td className="py-2 px-4 border border-gray-200 bg-black/10 text-center w-20">
            <Input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 0)}
              className="w-20 text-center bg-transparent border-0 mx-auto"
            />
          </td>
          <td className="py-2 px-4 border border-gray-200 bg-black/10">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="cursor-move">
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </td>
        </>
      ) : (
        // Without minutes column
        <>
          <td colSpan="4"className="py-2 px-4 border border-gray-200 bg-black/10 text-center">
            <Input
              value={name}
              onChange={(e) => onBreakTextChange(id, e.target.value)}
              className="w-full text-center border-0 bg-transparent font-medium text-base"
            />
          </td>
          <td className="py-2 px-4 border border-gray-200 bg-black/10">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="cursor-move">
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </td>
        </>
      )}
    </>
  );
};

export default BreakItem;
