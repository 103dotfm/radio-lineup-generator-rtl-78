
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import LineupItem from '../LineupItem';
import { useAuth } from '../../contexts/AuthContext';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center space-x-2">
        <Switch 
          id="show-minutes" 
          checked={showMinutesLocal} 
          onCheckedChange={handleToggleMinutes} 
        />
        <Label htmlFor="show-minutes" className="mr-2">הצגת זמן בדקות</Label>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lineup">
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px]">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                  <col className="w-[35%]" />
                  {isAuthenticated && <col className="w-[15%]" />}
                  {showMinutesLocal && <col className="w-[6%]" />}
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">שם</th>
                    <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">קרדיט</th>
                    <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">פרטים</th>
                    {isAuthenticated && <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">טלפון</th>}
                    {showMinutesLocal && <th className="py-2 px-4 text-center border font-bold bg-slate-300 hover:bg-slate-200 w-16">דק'</th>}
                    <th className="py-2 px-4 text-right border font-bold bg-slate-300 hover:bg-slate-200">פעולות</th>
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
                      showMinutes={showMinutesLocal}
                    />
                  ))}
                  {provided.placeholder}
                </tbody>
                {showMinutesLocal && (
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
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default LineupTable;
