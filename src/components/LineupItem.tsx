import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Coffee, GripVertical } from "lucide-react";
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
      <Draggable draggableId={id} index={index}>
        {(provided, snapshot) => (
          <tr
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`bg-gray-100 transition-colors ${snapshot.isDragging ? 'opacity-70 shadow-lg' : ''}`}
          >
            <td colSpan={5} className="py-2 px-2 text-center relative">
              <div className="flex items-center justify-center gap-2">
                <div
                  {...provided.dragHandleProps}
                  className="absolute right-2 cursor-grab active:cursor-grabbing print:hidden"
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
                <Coffee className="h-4 w-4 text-gray-500 print:hidden" />
                <span>{name} - {duration} דקות</span>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                  className="h-8 w-8 mr-2 print:hidden"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        )}
      </Draggable>
    );
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => onEdit && onEdit(id)}
          className={`transition-colors hover:bg-gray-50 ${snapshot.isDragging ? 'opacity-70 shadow-lg bg-gray-50' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <td className="py-2 px-2 relative">
            <div
              {...provided.dragHandleProps}
              className="absolute right-2 cursor-grab active:cursor-grabbing print:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            {name}
          </td>
          <td className="py-2 px-2">{title}</td>
          <td className="py-2 px-2">{details}</td>
          <td className="py-2 px-2">{phone}</td>
          <td className="py-2 px-2">
            <div className="flex items-center gap-2 justify-end">
              <div className="flex items-center gap-1 print:hidden">
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
                className="h-8 w-8 print:hidden"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden print:block">
              {duration} דקות
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );
};

export default LineupItem;