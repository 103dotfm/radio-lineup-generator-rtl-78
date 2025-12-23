import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useAuth } from '../../contexts/AuthContext';
import MinutesToggle from './table/MinutesToggle';
import LineupTableGroup from './table/LineupTableGroup';
import { sanitizeShowDetails } from '@/utils/sanitize';

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
    interviewees?: Array<{
      id: string;
      item_id: string;
      name: string;
      title?: string;
      phone?: string;
      duration?: number;
      created_at?: string;
    }>;
  }>;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange: (id: string, details: string) => void;
  onDragEnd: (result: any) => void;
  showMinutes?: boolean;
  onToggleMinutes?: (show: boolean) => void;
  isBackupShow?: boolean;
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
  onToggleMinutes,
  isBackupShow
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

      {/* Desktop table */}
      <div className="hidden md:block lineup-table-wrapper">
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
                    isBackupShow={isBackupShow}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Mobile list view */}
      <div className="md:hidden space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="rounded border p-3 bg-white">
            <div className="flex justify-between items-center">
              <div className="font-semibold text-sm">{item.name || (item.is_break ? 'הפסקה' : item.is_note ? 'הערה' : '')}</div>
              {showMinutesLocal && (
                <div className="text-xs text-slate-600">{item.duration || 0} דק'</div>
              )}
            </div>
            {item.title && (
              <div className="text-xs text-slate-700 mt-1">{item.title}</div>
            )}
            {item.details && (
              <div className="prose prose-sm rtl text-xs mt-2" dangerouslySetInnerHTML={{ __html: sanitizeShowDetails(item.details) }} />
            )}
            {isAuthenticated && item.phone && (
              <div className="text-xs text-slate-600 mt-2">טלפון: {item.phone}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button className="text-xs px-2 py-1 border rounded" onClick={() => onEdit(item.id, item)}>ערוך</button>
              <button className="text-xs px-2 py-1 border rounded" onClick={() => onDelete(item.id)}>מחק</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineupTable;
