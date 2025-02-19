
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
            <div className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }} className="py-2 px-4 text-right border border-gray-200 font-bold align-top">שם</th>
                      <th style={{ width: '20%' }} className="py-2 px-4 text-right border border-gray-200 font-bold align-top">קרדיט</th>
                      <th style={{ width: '30%' }} className="py-2 px-4 text-right border border-gray-200 font-bold align-top">פרטים</th>
                      {isAuthenticated && (
                        <th style={{ width: '10%' }} className="py-2 px-4 text-right border border-gray-200 font-bold align-top">טלפון</th>
                      )}
                      <th style={{ width: '10%' }} className="py-2 px-4 text-right border border-gray-200 font-bold align-top">דקות</th>
                      <th style={{ width: '10%' }} className="py-2 px-4 text-right border border-gray-200 font-bold align-top">פעולות</th>
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
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default LineupTable;
