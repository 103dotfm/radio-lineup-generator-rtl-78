import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
  isAuthenticated,
}: BreakItemProps) => {
  return (
    <>
      <td colSpan={isAuthenticated ? 4 : 3} className="py-2 px-4 border border-gray-200 text-center">
        <div className="space-y-2">
          <div className="font-semibold text-gray-700">הפסקה מסחרית</div>
          <Input
            value={name}
            onChange={(e) => onBreakTextChange(id, e.target.value)}
            className="w-full text-center"
            placeholder="פרטי ההפסקה"
          />
        </div>
      </td>
      <td className="py-2 px-4 border border-gray-200 text-center">
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 5)}
          className="w-20 mx-auto text-center"
        />
      </td>
      <td className="py-2 px-4 border border-gray-200">
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </>
  );
};

export default BreakItem;