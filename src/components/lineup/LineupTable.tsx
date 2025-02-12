
import React from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import LineupItem from '../LineupItem';
import { useAuth } from '../../contexts/AuthContext';
import { Interviewee } from '@/types/show';

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
  onIntervieweesChange: (id: string, interviewees: Interviewee[]) => void;
  itemInterviewees: Record<string, Array<Interviewee>>;
}

const LineupTable = ({
  items,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
  onIntervieweesChange,
  itemInterviewees
}: LineupTableProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <Droppable droppableId="lineup">
      {(provided) => (
        <div 
          ref={provided.innerRef} 
          {...provided.droppableProps}
          className="min-h-[200px] transition-all overflow-x-auto"
        >
          <div className="w-full min-w-[800px] lg:min-w-0">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="py-2 px-4 text-right border border-gray-200 font-bold lineup-header-name align-top">שם</th>
                  <th className="py-2 px-4 text-right border border-gray-200 font-bold lineup-header-title align-top">קרדיט</th>
                  <th className="py-2 px-4 text-right border border-gray-200 font-bold lineup-header-details align-top">פרטים</th>
                  {isAuthenticated && (
                    <th className="py-2 px-4 text-right border border-gray-200 font-bold lineup-header-phone align-top">טלפון</th>
                  )}
                  <th className="py-2 px-4 text-right border border-gray-200 font-bold lineup-header-duration align-top">דקות</th>
                  <th className="py-2 px-4 text-right border border-gray-200 font-bold lineup-header-actions align-top">פעולות</th>
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
                    onIntervieweesChange={onIntervieweesChange}
                  />
                ))}
                {provided.placeholder}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Droppable>
  );
};

export default LineupTable;
