
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
    is_break?: boolean;
    is_note?: boolean;
  }>;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange: (id: string, details: string) => void;
  onDragEnd: (result: DropResult) => void;
}

const LineupTable = ({
  items,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
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
            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className="w-[20%] py-2 px-4 text-right border border-gray-200 font-bold align-top">שם</th>
                    <th className="w-[20%] py-2 px-4 text-right border border-gray-200 font-bold align-top">קרדיט</th>
                    <th className="w-[30%] py-2 px-4 text-right border border-gray-200 font-bold align-top">פרטים</th>
                    {isAuthenticated && (
                      <th className="w-[10%] py-2 px-4 text-right border border-gray-200 font-bold align-top">טלפון</th>
                    )}
                    <th className="w-[10%] py-2 px-4 text-right border border-gray-200 font-bold align-top">דקות</th>
                    <th className="w-[10%] py-2 px-4 text-right border border-gray-200 font-bold align-top">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <LineupItem
                      key={item.id}
                      {...item}
                      index={index}
                      onDelete={onDelete}
                      onDurationChange={onDurationChange}
                      onEdit={onEdit}
                      onBreakTextChange={onBreakTextChange}
                      onDetailsChange={onDetailsChange}
                    />
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default LineupTable;
