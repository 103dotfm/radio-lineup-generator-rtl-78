import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult, Draggable } from 'react-beautiful-dnd';
import LineupItem from '../LineupItem';
import { useAuth } from '../../contexts/AuthContext';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DividerItem from './DividerItem';

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
  onDragEnd: (result: DropResult) => void;
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

  // Debug - raw items before processing
  console.log('LineupTable raw items:', items);

  // Debug - inspect for any string vs boolean issues with explicit type checking
  console.log('LineupTable items with types:', items.map(item => {
    // Explicitly check boolean values
    const isDivider = item.is_divider === true;
    const isBreak = item.is_break === true;
    const isNote = item.is_note === true;

    return {
      id: item.id,
      name: item.name,
      is_divider: item.is_divider,
      is_divider_type: typeof item.is_divider,
      is_divider_explicit: isDivider,
      is_break: item.is_break,
      is_break_type: typeof item.is_break,
      is_note: item.is_note,
      is_note_type: typeof item.is_note,
      type: isDivider ? 'divider' : isBreak ? 'break' : isNote ? 'note' : 'regular'
    };
  }));

  const groupedItems = items.reduce((groups, item, index) => {
    // CRITICAL: Explicitly check for boolean true with === true
    const isDivider = item.is_divider === true;
    const isBreak = item.is_break === true;
    const isNote = item.is_note === true;
    
    console.log(`Processing item ${index} (${item.name}) for groups:`, {
      is_divider: isDivider,
      is_break: isBreak,
      is_note: isNote,
      raw_is_divider: item.is_divider,
      raw_is_divider_type: typeof item.is_divider
    });
    
    if (isDivider) {
      console.log(`Item ${item.name} is a divider, creating new group`);
      // CRITICAL: We MUST set is_divider: true explicitly here
      groups.push([{...item, index, is_divider: true}]);
    } else if (groups.length === 0) {
      console.log(`Item ${item.name} is first item, creating first group`);
      groups.push([{...item, index}]);
    } else {
      console.log(`Item ${item.name} added to existing group ${groups.length - 1}`);
      groups[groups.length - 1].push({...item, index});
    }
    return groups;
  }, [] as Array<Array<any>>);
  
  console.log('Grouped items:', groupedItems.map((group, i) => {
    return `Group ${i}: ${group.map(item => {
      const isDivider = item.is_divider === true;
      return `${item.name} (${isDivider ? 'divider' : 'regular'})`;
    }).join(', ')}`;
  }));
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center space-x-2 p-2 rounded">
        <Switch id="show-minutes" checked={showMinutesLocal} onCheckedChange={handleToggleMinutes} className="bg-emerald-400 hover:bg-emerald-300" />
        <Label htmlFor="show-minutes" className="mr-2 font-medium">הצגת זמן בדקות</Label>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lineup">
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px]">
              {groupedItems.map((group, groupIndex) => {
                // CRITICAL: Strictly check for boolean true
                const startsWithDivider = group[0]?.is_divider === true;
                console.log(`Group ${groupIndex} starts with divider:`, startsWithDivider, 'Raw value:', group[0]?.is_divider, 'Type:', typeof group[0]?.is_divider);
                
                return (
                  <div key={`group-${groupIndex}`} className="table-section mb-8">
                    {startsWithDivider && (
                      <Draggable draggableId={group[0].id} index={group[0].index}>
                        {(dividerProvided) => (
                          <table 
                            ref={dividerProvided.innerRef}
                            {...dividerProvided.draggableProps}
                            {...dividerProvided.dragHandleProps}
                            className="w-full table-fixed border-collapse mb-2"
                          >
                            <tbody>
                              <DividerItem 
                                id={group[0].id}
                                name={group[0].name}
                                index={group[0].index}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                isAuthenticated={isAuthenticated}
                                showMinutes={showMinutesLocal}
                              />
                            </tbody>
                          </table>
                        )}
                      </Draggable>
                    )}
                    
                    <table className="w-full table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[20%]" />
                        <col className="w-[15%]" />
                        <col className="w-[35%]" />
                        {isAuthenticated && <col className="w-[15%]" />}
                        {showMinutesLocal && <col className="w-[8%]" />}
                        <col className="w-[10%]" />
                      </colgroup>
                      
                      <thead>
                        <tr>
                          <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">שם</th>
                          <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">קרדיט</th>
                          <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">פרטים</th>
                          {isAuthenticated && <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">טלפון</th>}
                          {showMinutesLocal && <th className="py-2 px-4 text-center border font-bold bg-slate-300 hover:bg-slate-200 w-20">דק'</th>}
                          <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">פעולות</th>
                        </tr>
                      </thead>
                      
                      <tbody>
                        {group.slice(startsWithDivider ? 1 : 0).map((item) => (
                          <LineupItem 
                            key={item.id} 
                            {...item} 
                            index={item.index} 
                            onDelete={onDelete} 
                            onDurationChange={onDurationChange} 
                            onEdit={onEdit} 
                            onBreakTextChange={onBreakTextChange}
                            onDetailsChange={onDetailsChange}
                            showMinutes={showMinutesLocal} 
                          />
                        ))}
                      </tbody>
                      
                      {showMinutesLocal && groupIndex === groupedItems.length - 1 && (
                        <tfoot>
                          <tr>
                            <td colSpan={isAuthenticated ? 4 : 3} className="py-2 px-4 text-right font-bold border border-gray-200">
                              סה״כ דקות
                            </td>
                            <td className="py-2 px-4 text-center font-bold border border-gray-200">
                              {calculateTotalMinutes()}
                            </td>
                            <td className="py-2 px-4 border border-gray-200"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                );
              })}
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default LineupTable;
