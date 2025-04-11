
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DAYS_OF_WEEK, SHIFT_TYPE_LABELS, Shift, CustomRow } from './types';
import { useArrangement } from './ArrangementContext';
import { CustomRowColumns } from '@/components/schedule/workers/CustomRowColumns';

interface ShiftTableProps {
  onEditShift: (shift: Shift) => void;
  onAddShift: (day: number, shiftType: string) => void;
  onEditCustomRow: (row: CustomRow) => void;
  onAddCustomRow: () => void;
}

const ShiftTable: React.FC<ShiftTableProps> = ({ 
  onEditShift, 
  onAddShift, 
  onEditCustomRow, 
  onAddCustomRow 
}) => {
  const { 
    arrangement, 
    shifts, 
    customRows, 
    currentSection, 
    setShifts, 
    setCustomRows,
  } = useArrangement();
  const { toast } = useToast();
  
  const [pendingCustomCellUpdates, setPendingCustomCellUpdates] = useState<Record<string, any>>({});
  const [cellFocused, setCellFocused] = useState<string | null>(null);

  const handleDeleteShift = async (id: string) => {
    try {
      const { error } = await supabase
        .from('digital_shifts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setShifts(shifts.filter(shift => shift.id !== id));
      toast({
        title: "בוצע",
        description: "המשמרת נמחקה בהצלחה"
      });
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את המשמרת",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCustomRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('digital_shift_custom_rows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCustomRows(customRows.filter(row => row.id !== id));
      toast({
        title: "בוצע",
        description: "השורה נמחקה בהצלחה"
      });
    } catch (error) {
      console.error('Error deleting custom row:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את השורה",
        variant: "destructive"
      });
    }
  };

  const updateShiftWorker = async (shift: Shift, workerId: string | null, additionalText?: string) => {
    if (!arrangement) return;
    
    try {
      if (shift.person_name !== workerId || shift.additional_text !== additionalText) {
        const { error } = await supabase
          .from('digital_shifts')
          .update({
            person_name: workerId,
            additional_text: additionalText || shift.additional_text
          })
          .eq('id', shift.id);
        
        if (error) throw error;
        
        setShifts(shifts.map(s => 
          s.id === shift.id 
            ? {...s, person_name: workerId, additional_text: additionalText || s.additional_text}
            : s
        ));
      }
    } catch (error) {
      console.error('Error updating shift worker:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את העובד במשמרת",
        variant: "destructive"
      });
    }
  };

  const updateCustomCellContent = (rowId: string, dayIndex: number, content: string) => {
    const key = `${rowId}-${dayIndex}`;
    
    setPendingCustomCellUpdates(prev => ({
      ...prev,
      [key]: { rowId, dayIndex, content }
    }));
    
    setCustomRows(customRows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          contents: {
            ...row.contents,
            [dayIndex]: content
          }
        };
      }
      return row;
    }));
  };

  const saveCustomCellContent = async (rowId: string, dayIndex: number) => {
    const key = `${rowId}-${dayIndex}`;
    setCellFocused(null);
    
    const pendingUpdate = pendingCustomCellUpdates[key];
    
    if (pendingUpdate) {
      try {
        const row = customRows.find(r => r.id === rowId);
        if (!row) return;
        
        const updatedContents = { ...row.contents, [dayIndex]: pendingUpdate.content };
        
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .update({ contents: updatedContents })
          .eq('id', rowId);
        
        if (error) throw error;
        
        setPendingCustomCellUpdates(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      } catch (error) {
        console.error('Error updating custom cell content:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לעדכן את תוכן התא",
          variant: "destructive"
        });
      }
    }
  };

  const getShiftsForCell = (section: string, day: number, shiftType: string) => {
    return shifts.filter(shift => 
      shift.section_name === section && 
      shift.day_of_week === day && 
      shift.shift_type === shiftType
    );
  };

  const getCustomRowsForSection = (section: string) => {
    return customRows.filter(row => row.section_name === section);
  };

  const renderShiftCell = (section: string, day: number, shiftType: string) => {
    const cellShifts = getShiftsForCell(section, day, shiftType);
    
    if (cellShifts.length === 0) {
      return (
        <TableCell className="p-2 border text-center align-top">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onAddShift(day, shiftType)}
            className="w-full h-full min-h-[60px] flex items-center justify-center"
          >
            <Plus className="h-4 w-4 opacity-50" />
          </Button>
        </TableCell>
      );
    }
    
    return (
      <TableCell className="p-2 border align-top">
        {cellShifts.map((shift) => (
          <div 
            key={shift.id} 
            className={`mb-2 p-2 rounded ${shift.is_hidden ? 'opacity-50' : ''}`}
          >
            <div className="flex justify-between items-center mb-1">
              <div className={`text-xs ${shift.is_custom_time ? 'font-bold digital-shift-irregular-hours' : ''}`}>
                {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border border-border">
                  <DropdownMenuItem onClick={() => onEditShift(shift)}>
                    <Edit className="mr-2 h-4 w-4" />
                    ערוך
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteShift(shift.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="mt-2">
              <WorkerSelector
                value={shift.person_name}
                onChange={(workerId, additionalText) => updateShiftWorker(shift, workerId, additionalText)}
                additionalText={shift.additional_text || ''}
                placeholder="בחר עובד..."
                className="w-full"
              />
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  const renderCustomRows = (section: string) => {
    const rows = getCustomRowsForSection(section);
    
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-4">
            <Button 
              variant="outline" 
              onClick={onAddCustomRow}
            >
              <Plus className="mr-2 h-4 w-4" />
              הוסף שורה מותאמת אישית
            </Button>
          </TableCell>
        </TableRow>
      );
    }
    
    return rows.map((row) => (
      <TableRow key={row.id} className="custom-row-editor">
        <CustomRowColumns
          rowContents={row.contents}
          section={section}
          onContentChange={(dayIndex, content) => updateCustomCellContent(row.id, dayIndex, content)}
          onBlur={(dayIndex) => saveCustomCellContent(row.id, dayIndex)}
          onFocus={(dayIndex) => setCellFocused(`${row.id}-${dayIndex}`)}
          editable={true}
          showActions={true}
          onEdit={() => onEditCustomRow(row)}
          onDelete={() => handleDeleteCustomRow(row.id)}
        />
      </TableRow>
    ));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {DAYS_OF_WEEK.map((day, index) => (
            <TableHead key={day} className="text-center">
              {day}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => (
          <TableRow key={type}>
            {[0, 1, 2, 3, 4, 5].map((day) => (
              <React.Fragment key={`${type}-${day}`}>
                {renderShiftCell(currentSection, day, type)}
              </React.Fragment>
            ))}
          </TableRow>
        ))}
        
        {renderCustomRows(currentSection)}
      </TableBody>
    </Table>
  );
};

export default ShiftTable;
