
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, GripVertical } from "lucide-react";

interface BreakItemProps {
  id: string;
  name: string;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onBreakTextChange: (id: string, text: string) => void;
  isAuthenticated: boolean;
}

const BreakItem = ({
  id,
  name,
  duration,
  onDelete,
  onDurationChange,
  onBreakTextChange,
  isAuthenticated
}: BreakItemProps) => {
  return (
    <>
      <td
        colSpan={isAuthenticated ? 3 : 2}
        className="py-2 px-4 border border-gray-200 bg-gray-50 align-top"
      >
        <Input
          type="text"
          value={name}
          onChange={(e) => onBreakTextChange(id, e.target.value)}
          className="bg-transparent border-0 focus-visible:ring-0 p-0 text-center font-bold"
        />
      </td>
      {isAuthenticated && (
        <td className="py-2 px-4 border border-gray-200 bg-gray-50"></td>
      )}
      <td className="py-2 px-4 border border-gray-200 bg-gray-50 hidden">
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 5)}
          className="w-20"
        />
      </td>
      <td className="py-2 px-4 border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onDelete(id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="cursor-move">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </td>
    </>
  );
};

export default BreakItem;
