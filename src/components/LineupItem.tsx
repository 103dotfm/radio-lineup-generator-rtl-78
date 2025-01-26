import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Coffee, GripVertical, Edit2, Check } from "lucide-react";
import { Draggable } from 'react-beautiful-dnd';
import { Input } from "@/components/ui/input";

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
  onBreakTextChange?: (id: string, text: string) => void;
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
  onBreakTextChange,
  index,
}: LineupItemProps) => {
  const [isEditingBreak, setIsEditingBreak] = useState(false);
  const [breakText, setBreakText] = useState(name);

  const handleBreakTextSave = () => {
    if (onBreakTextChange) {
      onBreakTextChange(id, breakText);
    }
    setIsEditingBreak(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isBreak && onEdit && !e.defaultPrevented) {
      onEdit(id);
    }
  };

  if (isBreak) {
    return (
      <Draggable draggableId={id} index={index}>
        {(provided, snapshot) => (
          <tr
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`bg-gray-100 transition-colors ${snapshot.isDragging ? 'bg-blue-50 shadow-lg ring-2 ring-blue-200' : ''}`}
          >
            <td className="py-2 px-2 text-center relative" colSpan={5}>
              <div className="flex items-center justify-center gap-2">
                <div
                  {...provided.dragHandleProps}
                  className="absolute right-2 cursor-grab active:cursor-grabbing hover:bg-gray-200 rounded p-1 transition-colors print:hidden"
                  title="גרור כדי לשנות מיקום"
                >
                  <GripVertical className="h-5 w-5 text-gray-500" />
                </div>
                <Coffee className="h-4 w-4 text-gray-500 print:hidden" />
                {isEditingBreak ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={breakText}
                      onChange={(e) => setBreakText(e.target.value)}
                      className="w-48"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBreakTextSave}
                      className="h-8 w-8"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span>{name} - {duration} דקות</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingBreak(true)}
                      className="h-8 w-8 print:hidden"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
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
          onClick={handleClick}
          className={`transition-colors hover:bg-gray-50 cursor-pointer ${
            snapshot.isDragging ? 'bg-blue-50 shadow-lg ring-2 ring-blue-200' : ''
          }`}
        >
          <td className="py-2 px-2 relative">
            <div
              {...provided.dragHandleProps}
              className="absolute right-2 cursor-grab active:cursor-grabbing hover:bg-gray-200 rounded p-1 transition-colors print:hidden"
              onClick={(e) => e.stopPropagation()}
              title="גרור כדי לשנות מיקום"
            >
              <GripVertical className="h-5 w-5 text-gray-500" />
            </div>
            {name}
          </td>
          <td className="py-2 px-2">{title}</td>
          <td className="py-2 px-2 whitespace-pre-line">{details}</td>
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