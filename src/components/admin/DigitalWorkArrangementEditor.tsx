
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Worker } from '@/lib/supabase/workers';
import { getWorkersByDivisionId } from '@/lib/supabase/divisions';
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the Digital division ID - replace with actual ID from database
const DIGITAL_DIVISION_ID = '4b221a12-b4e5-4e40-8f44-c38ba85f6d96'; // Replace with actual Digital division ID

interface Shift {
  id: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string;
  is_hidden: boolean;
  is_custom_time: boolean;
  additional_text?: string;
}

interface ShiftDialogData {
  id?: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string;
  is_hidden: boolean;
  is_custom_time: boolean;
  additional_text?: string;
}

const DEFAULT_SHIFT_TIMES = {
  morning: { start: '07:00', end: '15:00' },
  evening: { start: '15:00', end: '23:00' },
  night: { start: '23:00', end: '07:00' }
};

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const SECTIONS = ['עריכה ותוכן', 'הפקה', 'בוקר', 'צהריים', 'חצות'];
const SHIFT_TYPES = ['בוקר', 'ערב', 'לילה'];

const DigitalWorkArrangementEditor: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [newShiftData, setNewShiftData] = useState<ShiftDialogData>({
    section_name: SECTIONS[0],
    day_of_week: 0,
    shift_type: SHIFT_TYPES[0],
    start_time: DEFAULT_SHIFT_TIMES.morning.start,
    end_time: DEFAULT_SHIFT_TIMES.morning.end,
    person_name: '',
    is_hidden: false,
    is_custom_time: false
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDigitalWorkers();
  }, []);

  const loadDigitalWorkers = async () => {
    setLoading(true);
    try {
      console.log("Loading workers from Digital division...");
      const digitalWorkers = await getWorkersByDivisionId(DIGITAL_DIVISION_ID);
      console.log(`Loaded ${digitalWorkers.length} workers from Digital division`);
      setWorkers(digitalWorkers);
    } catch (error) {
      console.error("Error loading digital workers:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת עובדי דיגיטל",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Example function to get shifts for a cell (section, day, shift type)
  const getShiftsForCell = (section: string, day: number, shiftType: string) => {
    return shifts.filter(
      shift => 
        shift.section_name === section && 
        shift.day_of_week === day && 
        shift.shift_type === shiftType
    );
  };

  // Function to open shift dialog for editing
  const openShiftDialog = (shift: Shift) => {
    setEditingShift(shift.id);
    setNewShiftData({
      ...shift
    });
    setShiftDialogOpen(true);
  };

  // Function to update a shift's worker
  const updateShiftWorker = (shift: Shift, workerId: string | null, additionalText: string) => {
    setShifts(currentShifts => 
      currentShifts.map(s => 
        s.id === shift.id 
          ? { ...s, person_name: workerId || '', additional_text: additionalText } 
          : s
      )
    );
    // Here you would also save to database
  };

  // Function to handle shift deletion
  const handleDeleteShift = (shiftId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק משמרת זו?')) {
      setShifts(currentShifts => currentShifts.filter(s => s.id !== shiftId));
      // Here you would also delete from database
    }
  };

  // Function to handle saving a shift
  const handleSaveShift = () => {
    if (editingShift) {
      // Updating existing shift
      setShifts(currentShifts => 
        currentShifts.map(s => 
          s.id === editingShift 
            ? { ...newShiftData, id: editingShift } 
            : s
        )
      );
    } else {
      // Adding new shift
      const newShift = {
        ...newShiftData,
        id: Date.now().toString() // Simple ID generation for example
      };
      setShifts(currentShifts => [...currentShifts, newShift]);
    }
    
    // Close dialog and reset state
    setShiftDialogOpen(false);
    setEditingShift(null);
    setNewShiftData({
      section_name: SECTIONS[0],
      day_of_week: 0,
      shift_type: SHIFT_TYPES[0],
      start_time: DEFAULT_SHIFT_TIMES.morning.start,
      end_time: DEFAULT_SHIFT_TIMES.morning.end,
      person_name: '',
      is_hidden: false,
      is_custom_time: false
    });
    
    // Here you would also save to database
  };

  // Function to render a shift cell
  const renderShiftCell = (section: string, day: number, shiftType: string) => {
    const cellShifts = getShiftsForCell(section, day, shiftType);
    if (cellShifts.length === 0) {
      return (
        <TableCell className="p-2 border text-center align-top">
          <Button variant="ghost" size="sm" onClick={() => {
            setNewShiftData({
              ...newShiftData,
              section_name: section,
              day_of_week: day,
              shift_type: shiftType,
              start_time: DEFAULT_SHIFT_TIMES[shiftType as keyof typeof DEFAULT_SHIFT_TIMES].start,
              end_time: DEFAULT_SHIFT_TIMES[shiftType as keyof typeof DEFAULT_SHIFT_TIMES].end
            });
            setEditingShift(null);
            setShiftDialogOpen(true);
          }} className="w-full h-full min-h-[60px] flex items-center justify-center">
            <Plus className="h-4 w-4 opacity-50" />
          </Button>
        </TableCell>
      );
    }
    
    return (
      <TableCell className="p-2 border align-top">
        {cellShifts.map(shift => (
          <div key={shift.id} className={`mb-2 p-2 rounded ${shift.is_hidden ? 'opacity-50' : ''}`}>
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
                  <DropdownMenuItem onClick={() => openShiftDialog(shift)}>
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
                onChange={(workerId, additionalText) => updateShiftWorker(shift, workerId, additionalText || '')} 
                additionalText={shift.additional_text || ''} 
                placeholder="בחר עובד..." 
                className="w-full"
                workers={workers} 
              />
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">סידור עבודה דיגיטל - שבוע {/* add date here */}</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>טוען נתונים...</p>
        </div>
      ) : (
        <Table className="border border-border">
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">מחלקה</TableHead>
              {DAYS.map((day, index) => (
                <TableHead key={day} className="text-center">{day}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {SECTIONS.map(section => (
              <React.Fragment key={section}>
                {SHIFT_TYPES.map((shiftType, typeIndex) => (
                  <TableRow key={`${section}-${shiftType}`}>
                    {typeIndex === 0 && (
                      <TableCell rowSpan={SHIFT_TYPES.length} className="border font-medium align-middle">
                        {section}
                      </TableCell>
                    )}
                    {DAYS.map((_, dayIndex) => renderShiftCell(section, dayIndex, shiftType))}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'ערוך משמרת' : 'הוסף משמרת חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="section-name">מחלקה</Label>
              <div className="col-span-3">
                <Select
                  value={newShiftData.section_name}
                  onValueChange={(value) => setNewShiftData({...newShiftData, section_name: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר מחלקה" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((section) => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="day-of-week">יום</Label>
              <div className="col-span-3">
                <Select
                  value={newShiftData.day_of_week.toString()}
                  onValueChange={(value) => setNewShiftData({...newShiftData, day_of_week: parseInt(value)})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר יום" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, index) => (
                      <SelectItem key={day} value={index.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="shift-type">משמרת</Label>
              <div className="col-span-3">
                <Select
                  value={newShiftData.shift_type}
                  onValueChange={(value) => {
                    setNewShiftData({
                      ...newShiftData,
                      shift_type: value,
                      start_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES]?.start || '',
                      end_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES]?.end || ''
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר משמרת" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="start-time">שעת התחלה</Label>
              <Input
                id="start-time"
                type="time"
                value={newShiftData.start_time}
                onChange={(e) => setNewShiftData({...newShiftData, start_time: e.target.value, is_custom_time: true})}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="end-time">שעת סיום</Label>
              <Input
                id="end-time"
                type="time"
                value={newShiftData.end_time}
                onChange={(e) => setNewShiftData({...newShiftData, end_time: e.target.value, is_custom_time: true})}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="person-name">עובד</Label>
              <div className="col-span-3">
                <WorkerSelector 
                  value={newShiftData.person_name || null} 
                  onChange={(value, additionalText) => setNewShiftData({
                    ...newShiftData,
                    person_name: value || '',
                    additional_text: additionalText || ''
                  })} 
                  additionalText={newShiftData.additional_text} 
                  placeholder="בחר עובד..." 
                  workers={workers} 
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setShiftDialogOpen(false)}>
              ביטול
            </Button>
            <Button type="button" onClick={handleSaveShift}>
              {editingShift ? 'עדכן משמרת' : 'הוסף משמרת'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalWorkArrangementEditor;
