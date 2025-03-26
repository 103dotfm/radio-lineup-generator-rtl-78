
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { useAuth } from '../../contexts/AuthContext';
import MinutesToggle from './table/MinutesToggle';
import LineupTableGroup from './table/LineupTableGroup';

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
    is_divider?: boolean;
  }>;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange: (id: string, details: string) => void;
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
  const [showMinutesLocal, setShowMinutesLocal] = useState(showMinutes);
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    setShowMinutesLocal(showMinutes);
  }, [showMinutes]);
  
  const handleToggleMinutes = (checked: boolean) => {
    setShowMinutesLocal(checked);
    if (onToggleMinutes) {
      onToggleMinutes(checked);
    }
  };
  
  const calculateTotalMinutes = () => {
    return items.reduce((total, item) => total + (item.duration || 0), 0);
  };

  const groupedItems = items.reduce((groups, item, index) => {
    // CRITICAL: Explicitly check for boolean true with === true
    const isDivider = item.is_divider === true;
    const isBreak = item.is_break === true;
    const isNote = item.is_note === true;
    
    if (isDivider) {
      groups.push([{...item, index, is_divider: true}]);
    } else if (groups.length === 0) {
      groups.push([{...item, index}]);
    } else {
      groups[groups.length - 1].push({...item, index});
    }
    return groups;
  }, [] as Array<Array<any>>);
  
  return (
    <div className="space-y-2 sm:space-y-4">
      <MinutesToggle 
        showMinutes={showMinutesLocal} 
        onToggleMinutes={handleToggleMinutes} 
      />

      <div className="lineup-table-wrapper">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="lineup">
            {provided => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px]">
                {groupedItems.map((group, groupIndex) => (
                  <LineupTableGroup
                    key={`group-${groupIndex}`}
                    group={group}
                    groupIndex={groupIndex}
                    isLastGroup={groupIndex === groupedItems.length - 1}
                    showMinutes={showMinutesLocal}
                    isAuthenticated={isAuthenticated}
                    onDelete={onDelete}
                    onDurationChange={onDurationChange}
                    onEdit={onEdit}
                    onBreakTextChange={onBreakTextChange}
                    onDetailsChange={onDetailsChange}
                    calculateTotalMinutes={calculateTotalMinutes}
                  />
                ))}
                
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

export default LineupTable;
