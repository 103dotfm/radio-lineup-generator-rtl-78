import React from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import LineupItem from '../LineupItem';
import { useAuth } from '../../contexts/AuthContext';

interface LineupTableProps {
  items: Array<{
    id: string;
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    isBreak?: boolean;
  }>;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string) => void;
  onBreakTextChange: (id: string, text: string) => void;
  onDragEnd: (result: DropResult) => void;
}

const LineupTable = ({
  items,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDragEnd
}: LineupTableProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="lineup">
        {(provided) => (
          <div 
            ref={provided.innerRef} 
            {...provided.droppableProps}
            className="min-h-[200px] transition-all"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="py-2 px-4 text-right border border-gray-200">שם</th>
                  <th className="py-2 px-4 text-right border border-gray-200">כותרת</th>
                  <th className="py-2 px-4 text-right border border-gray-200">פרטים</th>
                  {isAuthenticated && (
                    <th className="py-2 px-4 text-right border border-gray-200">טלפון</th>
                  )}
                  <th className="py-2 px-4 text-right border border-gray-200">דקות</th>
                  <th className="py-2 px-4 text-right border border-gray-200">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <LineupItem
                    key={item.id}
                    {...item}
                    index={index}
                    onDelete={onDelete}
                    onDurationChange={onDurationChange}
                    onEdit={onEdit}
                    onBreakTextChange={onBreakTextChange}
                  />
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