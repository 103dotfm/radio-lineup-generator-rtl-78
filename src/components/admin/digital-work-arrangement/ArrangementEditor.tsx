
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DigitalWorkArrangementView from '@/components/schedule/DigitalWorkArrangementView';
import { useArrangementData } from './useArrangementData';
import { useArrangement } from './ArrangementContext';
import ShiftDialog from './ShiftDialog';
import CustomRowDialog from './CustomRowDialog';
import FooterTextDialog from './FooterTextDialog';
import ShiftTable from './ShiftTable';
import ArrangementActions from './ArrangementActions';
import SectionSelector from './SectionSelector';
import { format } from 'date-fns';
import { Shift, CustomRow, DEFAULT_SHIFT_TIMES } from './types';

const ArrangementEditor: React.FC = () => {
  const { 
    weekDate, 
    setArrangement, 
    setShifts, 
    setCustomRows, 
    currentSection 
  } = useArrangement();
  
  const {
    arrangement,
    shifts,
    customRows,
    footerText,
    loading,
    setFooterText,
    refreshData
  } = useArrangementData(weekDate);

  const [previewMode, setPreviewMode] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [customRowDialogOpen, setCustomRowDialogOpen] = useState(false);
  const [footerTextDialogOpen, setFooterTextDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingCustomRow, setEditingCustomRow] = useState<CustomRow | null>(null);
  const [newShiftDay, setNewShiftDay] = useState(0);
  const [newShiftType, setNewShiftType] = useState('morning');

  // Update parent context when local state changes
  useEffect(() => {
    setArrangement(arrangement);
    setShifts(shifts);
    setCustomRows(customRows);
  }, [arrangement, shifts, customRows, setArrangement, setShifts, setCustomRows]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
      
      const strayDivs = document.querySelectorAll('div[id^="cbcb"]');
      strayDivs.forEach(div => div.remove());
    };
  }, []);

  // Handler functions
  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftDialogOpen(true);
  };

  const handleAddShift = (day: number, shiftType: string) => {
    setEditingShift(null);
    setNewShiftDay(day);
    setNewShiftType(shiftType);
    setShiftDialogOpen(true);
  };

  const handleEditCustomRow = (row: CustomRow) => {
    setEditingCustomRow(row);
    setCustomRowDialogOpen(true);
  };

  const handleAddCustomRow = () => {
    setEditingCustomRow(null);
    setCustomRowDialogOpen(true);
  };

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  if (loading) {
    return (
      <div className="flex justify-center my-8">
        <p>טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <ArrangementActions 
        previewMode={previewMode} 
        togglePreviewMode={togglePreviewMode} 
      />

      {previewMode ? (
        <Card>
          <CardContent className="p-6">
            <div id="digital-work-arrangement-preview">
              <DigitalWorkArrangementView weekDate={format(weekDate, 'yyyy-MM-dd')} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <SectionSelector />

          <div className="flex flex-wrap space-x-2 space-x-reverse mb-4">
            <Button onClick={() => setFooterTextDialogOpen(true)}>
              {arrangement?.footer_text ? 'ערוך טקסט תחתון' : 'הוסף טקסט תחתון'}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <ShiftTable 
                onEditShift={handleEditShift}
                onAddShift={handleAddShift}
                onEditCustomRow={handleEditCustomRow}
                onAddCustomRow={handleAddCustomRow}
              />
            </CardContent>
          </Card>

          <ShiftDialog
            open={shiftDialogOpen}
            onOpenChange={setShiftDialogOpen}
            editingShift={editingShift}
            onSuccess={refreshData}
          />

          <CustomRowDialog
            open={customRowDialogOpen}
            onOpenChange={setCustomRowDialogOpen}
            editingCustomRow={editingCustomRow}
            onSuccess={refreshData}
          />

          <FooterTextDialog
            open={footerTextDialogOpen}
            onOpenChange={setFooterTextDialogOpen}
            footerText={footerText}
            setFooterText={setFooterText}
            onSuccess={refreshData}
          />
        </>
      )}
    </div>
  );
};

export default ArrangementEditor;
