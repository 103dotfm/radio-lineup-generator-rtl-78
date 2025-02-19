
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
            className="min-h-[200px] transition-all overflow-x-auto"
          >
            <div className="w-full min-w-[800px] lg:min-w-0">
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '30%' }} />
                  {isAuthenticated && <col style={{ width: '10%' }} />}
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="py-2 px-4 text-right border border-gray-200 font-bold align-top w-[20%]">שם</th>
                    <th scope="col" className="py-2 px-4 text-right border border-gray-200 font-bold align-top w-[20%]">קרדיט</th>
                    <th scope="col" className="py-2 px-4 text-right border border-gray-200 font-bold align-top w-[30%]">פרטים</th>
                    {isAuthenticated && (
                      <th scope="col" className="py-2 px-4 text-right border border-gray-200 font-bold align-top w-[10%]">טלפון</th>
                    )}
                    <th scope="col" className="py-2 px-4 text-right border border-gray-200 font-bold align-top w-[10%]">דקות</th>
                    <th scope="col" className="py-2 px-4 text-right border border-gray-200 font-bold align-top w-[10%]">פעולות</th>
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
