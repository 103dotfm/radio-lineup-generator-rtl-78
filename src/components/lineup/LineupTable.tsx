import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

interface LineupTableProps {
  items: any[];
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string) => void;
  onBreakTextChange: (id: string, text: string) => void;
  onDragEnd: (result: any) => void;
  showActions?: boolean;
}

const LineupTable = ({
  items,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDragEnd,
  showActions = true
}: LineupTableProps) => {
  const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
    userSelect: 'none',
    ...draggableStyle,
  });

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-right">
                  <th className="p-2 border-b">שם</th>
                  <th className="p-2 border-b">כותרת</th>
                  <th className="p-2 border-b">פרטים</th>
                  <th className="p-2 border-b">טלפון</th>
                  <th className="p-2 border-b">משך</th>
                  {showActions && <th className="p-2 border-b print:hidden">פעולות</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      item.isBreak ? (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                          className="bg-gray-100 print:bg-gray-100"
                        >
                          <td colSpan={showActions ? 6 : 5} className="p-2 border-b text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Coffee className="h-4 w-4 text-gray-500" />
                              <Input
                                value={item.name}
                                onChange={(e) => onBreakTextChange(item.id, e.target.value)}
                                className="w-48 mx-2 print:hidden"
                                autoComplete="on"
                              />
                              <span className="hidden print:inline">{item.name}</span>
                              <span>{item.duration} דקות</span>
                              <div className="print:hidden flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEdit(item.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                          className={cn(
                            "hover:bg-muted/50"
                          )}
                        >
                          <td className="p-2 border-b">{item.name}</td>
                          <td className="p-2 border-b">{item.title}</td>
                          <td className="p-2 border-b">{item.details}</td>
                          <td className="p-2 border-b">{item.phone}</td>
                          <td className="p-2 border-b">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.duration}
                                onChange={(e) => onDurationChange(item.id, parseInt(e.target.value) || 5)}
                                className="w-20 print:hidden"
                              />
                              <span className="hidden print:inline">{item.duration} דקות</span>
                            </div>
                          </td>
                          {showActions && (
                            <td className="p-2 border-b print:hidden">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEdit(item.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            </table>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default LineupTable;