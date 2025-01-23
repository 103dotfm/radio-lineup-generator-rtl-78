import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Coffee } from "lucide-react";
import { Draggable } from 'react-beautiful-dnd';

interface LineupItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  isBreak?: boolean;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit?: (id: string) => void;
  index: number;
}

const LineupItem = ({
  id,
  name,
  title,
  details,
  phone,
  duration,
  isBreak,
  onDelete,
  onDurationChange,
  onEdit,
  index,
}: LineupItemProps) => {
  if (isBreak) {
    return (
      <tr className="bg-gray-100">
        <td colSpan={5} className="py-2 px-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Coffee className="h-4 w-4 text-gray-500" />
            {name} - {duration} דקות
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="h-8 w-8 mr-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit && onEdit(id)}
          style={{ cursor: 'pointer' }}
        >
          <td className="py-2 px-2">{name}</td>
          <td className="py-2 px-2">{title}</td>
          <td className="py-2 px-2">{details}</td>
          <td className="py-2 px-2">{phone}</td>
          <td className="py-2 px-2">
            <div className="flex items-center gap-2 justify-end">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 0)}
                  className="w-16 text-center border rounded p-1"
                  min="1"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm">דקות</span>
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );
};

export default LineupItem;