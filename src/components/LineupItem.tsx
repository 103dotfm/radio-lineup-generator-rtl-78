import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2 } from "lucide-react";

interface LineupItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

const LineupItem = ({
  id,
  name,
  title,
  details,
  phone,
  duration,
  onDelete,
  onDurationChange,
}: LineupItemProps) => {
  return (
    <Card className="lineup-item p-4 mb-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-sm mt-2">{details}</p>
          <p className="text-sm text-gray-500 mt-1">{phone}</p>
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
            />
            <span className="text-sm">דקות</span>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => onDelete(id)}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default LineupItem;