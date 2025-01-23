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
  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${isBreak ? 'bg-gray-100' : ''}`}
          onClick={() => onEdit && onEdit(id)}
          style={{ cursor: 'pointer' }}
        >
          <Card className="lineup-item p-4 mb-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isBreak && <Coffee className="h-4 w-4 text-gray-500" />}
                  <h3 className="text-lg font-bold">{name}</h3>
                </div>
                {!isBreak && (
                  <>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-sm mt-2">{details}</p>
                    <p className="text-sm text-gray-500 mt-1">{phone}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
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
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
};

export default LineupItem;