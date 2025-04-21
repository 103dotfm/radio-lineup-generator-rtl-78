
import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MoreHorizontal, Clock, ChevronLeft, ChevronRight, Calendar, Eye, Printer, Download } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { Worker, getWorkers } from '@/lib/supabase/workers';
import { CustomRowColumns } from '@/components/schedule/workers/CustomRowColumns';
import DigitalWorkArrangementView from '@/components/schedule/DigitalWorkArrangementView';
import "../../../src/styles/digital-work-arrangement.css";

interface Shift {
  id: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string | null;
  additional_text: string | null;
  is_custom_time: boolean;
  is_hidden: boolean;
  position: number;
}

interface CustomRow {
  id: string;
  section_name: string;
  contents: Record<number, string>;
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
}

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: 'משמרות דיגיטל',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים'
};

const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  CUSTOM: 'custom'
};

const SHIFT_TYPE_LABELS = {
  [SHIFT_TYPES.MORNING]: 'בוקר',
  [SHIFT_TYPES.AFTERNOON]: 'צהריים',
  [SHIFT_TYPES.EVENING]: 'ערב',
  [SHIFT_TYPES.CUSTOM]: 'מותאם אישית'
};

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const DEFAULT_SHIFT_TIMES = {
  [SHIFT_TYPES.MORNING]: { start: '09:00', end: '13:00' },
  [SHIFT_TYPES.AFTERNOON]: { start: '13:00', end: '17:00' },
  [SHIFT_TYPES.EVENING]: { start: '17:00', end: '21:00' },
  [SHIFT_TYPES.CUSTOM]: { start: '12:00', end: '15:00' },
};

const DigitalWorkArrangementEditor: React.FC = () => {
  const { toast } = useToast();
  const [weekDate, setWeekDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [arrangementData, setArrangementData] = useState<WorkArrangement | null>(null);
  const [footerText, setFooterText] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [isCreatingCustomRow, setIsCreatingCustomRow] = useState(false);
  const [newCustomRowSection, setNewCustomRowSection] = useState(SECTION_NAMES.RADIO_NORTH);
  const [customRowContentsByDay, setCustomRowContentsByDay] = useState<Record<number, string>>({});
  const [editingCustomRowId, setEditingCustomRowId] = useState<string | null>(null);

  // Preview states
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchWorkers();
    fetchData();
  }, [weekDate]);

  const fetchWorkers = async () => {
    try {
      const workersData = await getWorkers();
      setWorkers(workersData);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת העובדים",
        variant: "destructive",
      });
    }
  };

  const fetchData = async () => {
    try {
      const weekStartStr = format(weekDate, 'yyyy-MM-dd');
      
      // Fetch arrangement data
      const { data: arrangementData, error: arrangementError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr)
        .maybeSingle();
      
      if (arrangementError) throw arrangementError;
      
      if (arrangementData) {
        setArrangementData(arrangementData);
        setFooterText(arrangementData.footer_text || '');
        setNotes(arrangementData.notes || '');
      } else {
        setArrangementData(null);
        setFooterText('');
        setNotes('');
      }
      
      // Fetch shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('digital_work_shifts')
        .select('*')
        .eq('week_start', weekStartStr)
        .order('position', { ascending: true });
      
      if (shiftsError) throw shiftsError;
      
      setShifts(shiftsData || []);
      
      // Fetch custom rows
      const { data: customRowsData, error: customRowsError } = await supabase
        .from('digital_work_custom_rows')
        .select('*')
        .eq('week_start', weekStartStr)
        .order('position', { ascending: true });
      
      if (customRowsError) throw customRowsError;
      
      setCustomRows(customRowsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      });
    }
  };

  const saveArrangement = async () => {
    try {
      const weekStartStr = format(weekDate, 'yyyy-MM-dd');
      
      let arrangementId = arrangementData?.id;
      
      // If we don't have arrangement data yet, create it
      if (!arrangementId) {
        const { data, error } = await supabase
          .from('digital_work_arrangements')
          .insert({
            week_start: weekStartStr,
            footer_text: footerText,
            notes: notes
          })
          .select('id')
          .single();
        
        if (error) throw error;
        arrangementId = data.id;
        setArrangementData({ ...data, week_start: weekStartStr, footer_text: footerText, notes: notes });
      } else {
        // Update existing arrangement
        const { error } = await supabase
          .from('digital_work_arrangements')
          .update({
            footer_text: footerText,
            notes: notes
          })
          .eq('id', arrangementId);
        
        if (error) throw error;
        
        setArrangementData(prev => prev ? { ...prev, footer_text: footerText, notes: notes } : null);
      }
      
      toast({
        title: "נשמר בהצלחה",
        description: "פרטי סידור העבודה נשמרו בהצלחה",
      });
      
    } catch (error) {
      console.error('Error saving arrangement:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת סידור העבודה",
        variant: "destructive",
      });
    }
  };

  const handleAddShift = (sectionName: string) => {
    const highestPosition = shifts
      .filter(s => s.section_name === sectionName)
      .reduce((max, shift) => Math.max(max, shift.position), 0);
    
    const newShift: Omit<Shift, 'id'> = {
      section_name: sectionName,
      day_of_week: 0, // Sunday
      shift_type: SHIFT_TYPES.MORNING,
      start_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].start,
      end_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].end,
      person_name: null,
      additional_text: null,
      is_custom_time: false,
      is_hidden: false,
      position: highestPosition + 1
    };
    
    setEditingShift(newShift as Shift);
    setShowShiftDialog(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift({ ...shift });
    setShowShiftDialog(true);
  };

  const handleSaveShift = async () => {
    if (!editingShift) return;
    
    try {
      const weekStartStr = format(weekDate, 'yyyy-MM-dd');
      
      const shiftData = {
        ...editingShift,
        week_start: weekStartStr
      };
      
      delete (shiftData as any).id;
      
      if (editingShift.id) {
        // Update existing shift
        await supabase
          .from('digital_work_shifts')
          .update(shiftData)
          .eq('id', editingShift.id);
      } else {
        // Insert new shift
        await supabase
          .from('digital_work_shifts')
          .insert(shiftData);
      }
      
      setShowShiftDialog(false);
      fetchData();
      
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת המשמרת",
        variant: "destructive",
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await supabase
        .from('digital_work_shifts')
        .delete()
        .eq('id', shiftId);
      
      setShifts(shifts.filter(s => s.id !== shiftId));
      
      toast({
        title: "הצלחה",
        description: "המשמרת נמחקה בהצלחה",
      });
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת המשמרת",
        variant: "destructive",
      });
    }
  };

  const handleCreateCustomRow = async () => {
    try {
      const weekStartStr = format(weekDate, 'yyyy-MM-dd');
      
      const highestPosition = customRows
        .filter(r => r.section_name === newCustomRowSection)
        .reduce((max, row) => Math.max(max, row.position), 0);
      
      const newCustomRow = {
        section_name: newCustomRowSection,
        contents: customRowContentsByDay,
        position: highestPosition + 1,
        week_start: weekStartStr
      };
      
      if (editingCustomRowId) {
        // Update existing row
        await supabase
          .from('digital_work_custom_rows')
          .update({
            contents: customRowContentsByDay,
            section_name: newCustomRowSection
          })
          .eq('id', editingCustomRowId);
      } else {
        // Insert new row
        await supabase
          .from('digital_work_custom_rows')
          .insert(newCustomRow);
      }
      
      setIsCreatingCustomRow(false);
      setNewCustomRowSection(SECTION_NAMES.RADIO_NORTH);
      setCustomRowContentsByDay({});
      setEditingCustomRowId(null);
      fetchData();
      
    } catch (error) {
      console.error('Error saving custom row:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת השורה המותאמת",
        variant: "destructive",
      });
    }
  };

  const handleEditCustomRow = (row: CustomRow) => {
    setNewCustomRowSection(row.section_name);
    setCustomRowContentsByDay(row.contents);
    setEditingCustomRowId(row.id);
    setIsCreatingCustomRow(true);
  };

  const handleDeleteCustomRow = async (rowId: string) => {
    try {
      await supabase
        .from('digital_work_custom_rows')
        .delete()
        .eq('id', rowId);
      
      setCustomRows(customRows.filter(r => r.id !== rowId));
      
      toast({
        title: "הצלחה",
        description: "השורה המותאמת נמחקה בהצלחה",
      });
    } catch (error) {
      console.error('Error deleting custom row:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת השורה המותאמת",
        variant: "destructive",
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const handleShiftTypeChange = (type: string) => {
    if (!editingShift) return;
    
    setEditingShift(prev => ({
      ...prev,
      shift_type: type,
      ...(prev.is_custom_time ? {} : {
        start_time: DEFAULT_SHIFT_TIMES[type as keyof typeof DEFAULT_SHIFT_TIMES].start,
        end_time: DEFAULT_SHIFT_TIMES[type as keyof typeof DEFAULT_SHIFT_TIMES].end
      })
    }));
  };

  const getShiftsBySection = (sectionName: string) => {
    return shifts
      .filter(shift => shift.section_name === sectionName)
      .sort((a, b) => a.position - b.position);
  };

  const getCustomRowsBySection = (sectionName: string) => {
    return customRows
      .filter(row => row.section_name === sectionName)
      .sort((a, b) => a.position - b.position);
  };

  const handleCustomRowContentChange = (dayIndex: number, content: string) => {
    setCustomRowContentsByDay(prev => ({
      ...prev,
      [dayIndex]: content
    }));
  };

  const handleExportPdf = async () => {
    const element = document.getElementById('digital-work-arrangement-preview');
    if (!element) return;

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fff',
        logging: true,
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let y = 0;
      let remainingHeight = pdfHeight;
      
      while (remainingHeight > 0) {
        pdf.addImage(
          imgData,
          'PNG',
          0,
          y,
          pdfWidth,
          pdfHeight,
          undefined,
          'FAST'
        );
        remainingHeight -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          y = -pageHeight;
        }
      }

      pdf.save(`digital_${format(weekDate, 'dd-MM-yy')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const renderShiftDialog = () => {
    if (!editingShift) return null;
    
    return (
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingShift.id ? 'עריכת משמרת' : 'משמרת חדשה'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">יום</Label>
              <Select
                value={String(editingShift.day_of_week)}
                onValueChange={(value) => setEditingShift(prev => ({ ...prev, day_of_week: parseInt(value) }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="בחר יום" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={String(index)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">סוג משמרת</Label>
              <Select
                value={editingShift.shift_type}
                onValueChange={handleShiftTypeChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="בחר סוג משמרת" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1"></div>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="is_custom_time"
                  checked={editingShift.is_custom_time}
                  onCheckedChange={(checked) => setEditingShift(prev => ({ ...prev, is_custom_time: !!checked }))}
                />
                <Label htmlFor="is_custom_time" className="mr-2">שעות מותאמות אישית</Label>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">שעת התחלה</Label>
              <Input
                className="col-span-3"
                type="time"
                value={editingShift.start_time || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">שעת סיום</Label>
              <Input
                className="col-span-3"
                type="time"
                value={editingShift.end_time || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">שם העובד</Label>
              <div className="col-span-3">
                <WorkerSelector
                  workers={workers}
                  selectedWorkerId={null}
                  onWorkerSelect={(worker) => setEditingShift(prev => ({ ...prev, person_name: worker?.name || null }))}
                  selectedName={editingShift.person_name || undefined}
                  allowFreeText
                  allowClear
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-1">טקסט נוסף</Label>
              <Input
                className="col-span-3"
                placeholder="טקסט נוסף (אופציונלי)"
                value={editingShift.additional_text || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev, additional_text: e.target.value || null }))}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1"></div>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="is_hidden"
                  checked={editingShift.is_hidden}
                  onCheckedChange={(checked) => setEditingShift(prev => ({ ...prev, is_hidden: !!checked }))}
                />
                <Label htmlFor="is_hidden" className="mr-2">הסתר משמרת זו</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveShift}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSection = (sectionName: string, title: string) => {
    const sectionShifts = getShiftsBySection(sectionName);
    const sectionCustomRows = getCustomRowsBySection(sectionName);
    
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex space-x-2 space-x-reverse">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAddShift(sectionName)}
              >
                <Plus className="h-4 w-4 ml-2" /> הוסף משמרת
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setNewCustomRowSection(sectionName);
                  setCustomRowContentsByDay({});
                  setEditingCustomRowId(null);
                  setIsCreatingCustomRow(true);
                }}
              >
                <Plus className="h-4 w-4 ml-2" /> הוסף שורה מותאמת
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">פעולות</TableHead>
                {DAYS_OF_WEEK.map((day, index) => (
                  <TableHead key={index} className="text-center">{day}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionShifts.map(shift => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" dir="rtl">
                        <DropdownMenuItem onClick={() => handleEditShift(shift)}>
                          <Edit className="h-4 w-4 ml-2" /> ערוך
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteShift(shift.id)}
                        >
                          <Trash2 className="h-4 w-4 ml-2" /> מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  
                  {DAYS_OF_WEEK.map((_, dayIndex) => (
                    <TableCell key={dayIndex} className="text-center">
                      {shift.day_of_week === dayIndex && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center text-sm text-gray-600">
                            {shift.is_custom_time && <Clock className="h-3 w-3 mr-1" />}
                            {shift.start_time} - {shift.end_time}
                          </div>
                          <div className="font-medium">{shift.person_name || '-'}</div>
                          {shift.additional_text && (
                            <div className="text-sm text-gray-600">{shift.additional_text}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              
              {sectionCustomRows.map(row => (
                <TableRow key={row.id}>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" dir="rtl">
                        <DropdownMenuItem onClick={() => handleEditCustomRow(row)}>
                          <Edit className="h-4 w-4 ml-2" /> ערוך
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteCustomRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4 ml-2" /> מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  
                  {DAYS_OF_WEEK.map((_, dayIndex) => (
                    <TableCell key={dayIndex} className="text-center">
                      {row.contents && row.contents[dayIndex] ? row.contents[dayIndex] : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderCreateCustomRowDialog = () => {
    return (
      <Dialog open={isCreatingCustomRow} onOpenChange={setIsCreatingCustomRow}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCustomRowId ? 'עריכת שורה מותאמת' : 'הוספת שורה מותאמת'}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid grid-cols-4 items-center gap-4 mb-4">
              <Label className="text-right col-span-1">מיקום</Label>
              <Select
                value={newCustomRowSection}
                onValueChange={setNewCustomRowSection}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="בחר מיקום" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_TITLES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <CustomRowColumns 
              daysOfWeek={DAYS_OF_WEEK} 
              values={customRowContentsByDay}
              onChange={handleCustomRowContentChange}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreatingCustomRow(false);
              setNewCustomRowSection(SECTION_NAMES.RADIO_NORTH);
              setCustomRowContentsByDay({});
              setEditingCustomRowId(null);
            }}>ביטול</Button>
            <Button onClick={handleCreateCustomRow}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2 space-x-reverse">
          <h2 className="text-2xl font-bold">סידור עבודה דיגיטל</h2>
          <Button 
            variant={previewMode ? "default" : "outline"} 
            size="sm" 
            onClick={togglePreviewMode} 
            className="ml-2"
          >
            <Eye className="h-4 w-4 ml-2" />
            {previewMode ? 'צא מתצוגה מקדימה' : 'תצוגה מקדימה'}
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-[200px] flex items-center justify-center">
            <Calendar className="h-4 w-4 ml-2" />
            <span>
              {format(weekDate, 'dd/MM/yyyy')} - {format(addWeeks(weekDate, 1), 'dd/MM/yyyy')}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {previewMode ? (
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">תצוגה מקדימה</h3>
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  <Printer className="h-4 w-4 ml-2" /> ייצא ל-PDF
                </Button>
              </div>
              <div id="digital-work-arrangement-preview" className="border p-4 rounded-md">
                <DigitalWorkArrangementView 
                  weekDate={format(weekDate, 'yyyy-MM-dd')} 
                  previewMode={true} 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-4">
                <div>
                  <Label htmlFor="notes">הערות כלליות</Label>
                  <Textarea
                    id="notes"
                    placeholder="הערות כלליות לסידור העבודה"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="footer">טקסט תחתית</Label>
                  <Textarea
                    id="footer"
                    placeholder="טקסט שיופיע בתחתית הסידור"
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    className="mt-1 footer-text"
                    rows={4}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveArrangement}>שמור שינויים</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {renderSection(SECTION_NAMES.DIGITAL_SHIFTS, SECTION_TITLES[SECTION_NAMES.DIGITAL_SHIFTS])}
          {renderSection(SECTION_NAMES.RADIO_NORTH, SECTION_TITLES[SECTION_NAMES.RADIO_NORTH])}
          {renderSection(SECTION_NAMES.TRANSCRIPTION_SHIFTS, SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS])}
          {renderSection(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS])}
        </>
      )}
      
      {renderShiftDialog()}
      {renderCreateCustomRowDialog()}
    </div>
  );
};

export default DigitalWorkArrangementEditor;
