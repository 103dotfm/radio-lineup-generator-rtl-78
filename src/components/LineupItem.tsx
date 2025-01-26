import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';

interface LineupItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  isBreak?: boolean;
  index: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string) => void;
  onBreakTextChange: (id: string, text: string) => void;
}

const LineupItem = ({
  id,
  name,
  title,
  details,
  phone,
  duration,
  isBreak,
  index,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange
}: LineupItemProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${isBreak ? 'bg-gray-50' : ''}`}
        >
          <td className="py-2 px-4 border border-gray-200">
            {isBreak ? (
              <Input
                value={name}
                onChange={(e) => onBreakTextChange(id, e.target.value)}
                className="w-full"
              />
            ) : (
              name
            )}
          </td>
          <td className="py-2 px-4 border border-gray-200">{title}</td>
          <td className="py-2 px-4 border border-gray-200 whitespace-pre-line">{details}</td>
          {isAuthenticated && (
            <td className="py-2 px-4 border border-gray-200">{phone}</td>
          )}
          <td className="py-2 px-4 border border-gray-200">
            <Input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 5)}
              className="w-20"
            />
          </td>
          <td className="py-2 px-4 border border-gray-200">
            <div className="flex gap-2">
              {!isBreak && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(id)}
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