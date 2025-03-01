
import React, { useState } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import { Clock, Eye, EyeOff } from "lucide-react";
import LineupItem from '../LineupItem';
import DividerItem from './DividerItem';
import { useAuth } from '@/contexts/AuthContext';

interface LineupTableProps {
  items: any[];
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange?: (id: string, text: string) => void;
  onDetailsChange?: (id: string, details: string) => void;
  onDragEnd: (result: any) => void;
  showMinutes?: boolean;
  onToggleMinutes?: (show: boolean) => void;
}

const LineupTable = ({
  items,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
  onDragEnd,
  showMinutes = false,
  onToggleMinutes
}: LineupTableProps) => {
  const { isAuthenticated } = useAuth();
  const [showItemDurations, setShowItemDurations] = useState(showMinutes);

  const handleToggleMinutes = () => {
    const newValue = !showItemDurations;
    setShowItemDurations(newValue);
    if (onToggleMinutes) {
      onToggleMinutes(newValue);
    }
  };

  const calculateTotalDuration = () => {
    return items
      .filter(item => !item.is_divider) // Skip dividers in duration calculation
      .reduce((total, item) => total + (item.duration || 0), 0);
  };

  // Handle divider name changes
  const handleDividerNameChange = (id: string, name: string) => {
    onEdit(id, { name });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">פריטים בליינאפ</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleMinutes}
            className="flex items-center gap-1"
          >
            <Clock className="h-4 w-4" />
            {showItemDurations ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>הסתר דקות</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>הצג דקות</span>
              </>
            )}
          </Button>
          <div>סה״כ זמן: {calculateTotalDuration()} דקות</div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lineup-items">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="border rounded-md overflow-hidden"
            >
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    {showItemDurations && <th className="p-2 text-right">דקות</th>}
                    <th className="p-2 text-right">פריט</th>
                    <th className="p-2 text-right w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={showItemDurations ? 3 : 2} className="p-4 text-center text-gray-500">
                        אין פריטים בליינאפ
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      item.is_divider ? (
                        <tr key={item.id} className="divider-row">
                          <DividerItem
                            id={item.id}
                            name={item.name}
                            onDelete={onDelete}
                            onNameChange={handleDividerNameChange}
                            isAuthenticated={isAuthenticated}
                            showMinutes={showItemDurations}
                          />
                        </tr>
                      ) : (
                        <LineupItem
                          key={item.id}
                          id={item.id}
                          name={item.name}
                          title={item.title || ''}
                          details={item.details || ''}
                          phone={item.phone || ''}
                          duration={item.duration || 0}
                          is_break={item.is_break}
                          is_note={item.is_note}
                          is_divider={item.is_divider}
                          index={index}
                          onDelete={onDelete}
                          onDurationChange={onDurationChange}
                          onEdit={onEdit}
                          onBreakTextChange={onBreakTextChange || (() => {})}
                          onDetailsChange={onDetailsChange}
                          showMinutes={showItemDurations}
                        />
                      )
                    ))
                  )}
                  {provided.placeholder}
                </tbody>
              </table>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default LineupTable;
