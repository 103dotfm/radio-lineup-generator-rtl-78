
import React, { useState, useEffect } from 'react';
import { format, parse, startOfWeek, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Clock, User, Save, Eye, X } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface Shift {
  id?: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string | null;
  is_custom_time: boolean;
  is_hidden: boolean;
  position: number;
}

interface CustomRow {
  id?: string;
  section_name: string;
  content: string | null;
  position: number;
}

interface WorkArrangement {
  id?: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  shifts: Shift[];
  custom_rows: CustomRow[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: '',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון 12:00-09:00',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים וכו\'',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים, סושיאל ועוד'
};

const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  CUSTOM: 'custom'
};

const DEFAULT_TIMES = {
  [SHIFT_TYPES.MORNING]: {
    regular: { start: '07:00', end: '12:00' },
    friday: { start: '08:00', end: '12:00' }
  },
  [SHIFT_TYPES.AFTERNOON]: {
    regular: { start: '12:00', end: '16:00' },
    friday: { start: '12:00', end: '15:00' }
  },
  [SHIFT_TYPES.EVENING]: {
    regular: { start: '16:00', end: '22:00' },
    thursday: { start: '16:00', end: '21:00' }
  },
  [SECTION_NAMES.RADIO_NORTH]: {
    regular: { start: '09:00', end: '12:00' }
  },
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: { 
      regular: { start: '07:00', end: '14:00' },
      friday: { start: '08:00', end: '13:00' }
    },
    [SHIFT_TYPES.AFTERNOON]: { 
      regular: { start: '14:00', end: '20:00' }
    }
  },
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: { 
      regular: { start: '07:00', end: '14:00' },
      friday: { start: '08:00', end: '15:00' }
    },
    [SHIFT_TYPES.AFTERNOON]: { 
      regular: { start: '14:00', end: '20:00' }
    }
  }
};

interface DigitalWorkArrangementEditorProps {
  weekDate?: string; // Format: 'yyyy-MM-dd'
}

const DigitalWorkArrangementEditor: React.FC<DigitalWorkArrangementEditorProps> = ({ 
  weekDate 
}) => {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (weekDate) {
      try {
        const parsedDate = parse(weekDate, 'yyyy-MM-dd', new Date());
        return startOfWeek(parsedDate, { weekStartsOn: 0 });
      } catch (e) {
        console.error('Error parsing weekDate:', e);
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  
  const [arrangement, setArrangement] = useState<WorkArrangement>({
    week_start: format(currentWeek, 'yyyy-MM-dd'),
    notes: '',
    footer_text: '',
    footer_image_url: null,
    shifts: [],
    custom_rows: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isAddShiftDialogOpen, setIsAddShiftDialogOpen] = useState(false);
  
  // Calculate week dates for display in header
  useEffect(() => {
    const dates = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + i);
      return format(date, 'dd/MM', { locale: he });
    });
    setWeekDates(dates);
  }, [currentWeek]);
  
  // Format date for display
  const formatDateRange = () => {
    const startDay = format(currentWeek, 'dd', { locale: he });
    const endDate = new Date(currentWeek);
    endDate.setDate(endDate.getDate() + 5); // Friday
    const endDay = format(endDate, 'dd', { locale: he });
    const month = format(currentWeek, 'MMMM yyyy', { locale: he });
    return `${endDay}-${startDay} ב${month}`;
  };
  
  // Initialize the arrangement
  useEffect(() => {
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    setArrangement(prev => ({
      ...prev,
      week_start: weekStartStr
    }));
    fetchArrangement(weekStartStr);
  }, [currentWeek]);
  
  const fetchArrangement = async (weekStartStr: string) => {
    setIsLoading(true);
    
    try {
      // Check if arrangement exists for this week
      const { data: existingArrangement, error: fetchError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
        throw fetchError;
      }
      
      if (existingArrangement) {
        // Fetch shifts
        const { data: shifts, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', existingArrangement.id)
          .order('position', { ascending: true });
        
        if (shiftsError) throw shiftsError;
        
        // Fetch custom rows
        const { data: customRows, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', existingArrangement.id)
          .order('position', { ascending: true });
        
        if (customRowsError) throw customRowsError;
        
        setArrangement({
          id: existingArrangement.id,
          week_start: existingArrangement.week_start,
          notes: existingArrangement.notes,
          footer_text: existingArrangement.footer_text,
          footer_image_url: existingArrangement.footer_image_url,
          shifts: shifts || [],
          custom_rows: customRows || []
        });
      } else {
        // Create a new arrangement with default shifts
        createDefaultArrangement(weekStartStr);
      }
    } catch (error) {
      console.error('Error fetching arrangement:', error);
      toast({
        title: 'שגיאה בטעינת לוח משמרות',
        description: 'אירעה שגיאה בטעינת לוח המשמרות',
        variant: 'destructive'
      });
      createDefaultArrangement(weekStartStr);
    } finally {
      setIsLoading(false);
    }
  };
  
  const createDefaultArrangement = (weekStartStr: string) => {
    const defaultShifts: Shift[] = [];
    const defaultCustomRows: CustomRow[] = [];
    
    // Create digital shifts (3 shifts per day)
    let positionCounter = 0;
    
    // Morning shifts (all days)
    for (let day = 0; day < 6; day++) {
      const isFriday = day === 5;
      defaultShifts.push({
        section_name: SECTION_NAMES.DIGITAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: isFriday ? DEFAULT_TIMES[SHIFT_TYPES.MORNING].friday.start : DEFAULT_TIMES[SHIFT_TYPES.MORNING].regular.start,
        end_time: isFriday ? DEFAULT_TIMES[SHIFT_TYPES.MORNING].friday.end : DEFAULT_TIMES[SHIFT_TYPES.MORNING].regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Afternoon shifts (all days)
    for (let day = 0; day < 6; day++) {
      const isFriday = day === 5;
      defaultShifts.push({
        section_name: SECTION_NAMES.DIGITAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.AFTERNOON,
        start_time: isFriday ? DEFAULT_TIMES[SHIFT_TYPES.AFTERNOON].friday.start : DEFAULT_TIMES[SHIFT_TYPES.AFTERNOON].regular.start,
        end_time: isFriday ? DEFAULT_TIMES[SHIFT_TYPES.AFTERNOON].friday.end : DEFAULT_TIMES[SHIFT_TYPES.AFTERNOON].regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Evening shifts (Sunday to Thursday)
    for (let day = 0; day < 5; day++) {
      const isThursday = day === 4;
      defaultShifts.push({
        section_name: SECTION_NAMES.DIGITAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.EVENING,
        start_time: isThursday ? DEFAULT_TIMES[SHIFT_TYPES.EVENING].thursday.start : DEFAULT_TIMES[SHIFT_TYPES.EVENING].regular.start,
        end_time: isThursday ? DEFAULT_TIMES[SHIFT_TYPES.EVENING].thursday.end : DEFAULT_TIMES[SHIFT_TYPES.EVENING].regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Radio North shifts (Sunday to Thursday)
    for (let day = 0; day < 5; day++) {
      defaultShifts.push({
        section_name: SECTION_NAMES.RADIO_NORTH,
        day_of_week: day,
        shift_type: SHIFT_TYPES.CUSTOM,
        start_time: DEFAULT_TIMES[SECTION_NAMES.RADIO_NORTH].regular.start,
        end_time: DEFAULT_TIMES[SECTION_NAMES.RADIO_NORTH].regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Transcription shifts morning (all days)
    for (let day = 0; day < 6; day++) {
      const isFriday = day === 5;
      const times = DEFAULT_TIMES[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.MORNING];
      defaultShifts.push({
        section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: isFriday ? times.friday.start : times.regular.start,
        end_time: isFriday ? times.friday.end : times.regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Transcription shifts afternoon (Sunday to Thursday)
    for (let day = 0; day < 5; day++) {
      const times = DEFAULT_TIMES[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.AFTERNOON];
      defaultShifts.push({
        section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.AFTERNOON,
        start_time: times.regular.start,
        end_time: times.regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Default custom row for transcription
    defaultCustomRows.push({
      section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
      content: '',
      position: 0
    });
    
    // Live Social shifts morning (all days)
    for (let day = 0; day < 6; day++) {
      const isFriday = day === 5;
      const times = DEFAULT_TIMES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.MORNING];
      defaultShifts.push({
        section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: isFriday ? times.friday.start : times.regular.start,
        end_time: isFriday ? times.friday.end : times.regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    // Live Social shifts afternoon (Sunday to Thursday)
    for (let day = 0; day < 5; day++) {
      const times = DEFAULT_TIMES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.AFTERNOON];
      defaultShifts.push({
        section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.AFTERNOON,
        start_time: times.regular.start,
        end_time: times.regular.end,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }
    
    setArrangement({
      week_start: weekStartStr,
      notes: '',
      footer_text: '',
      footer_image_url: null,
      shifts: defaultShifts,
      custom_rows: defaultCustomRows
    });
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      let arrangementId = arrangement.id;
      
      // If no ID exists, create a new arrangement
      if (!arrangementId) {
        const { data: newArrangement, error: createError } = await supabase
          .from('digital_work_arrangements')
          .insert({
            week_start: arrangement.week_start,
            notes: arrangement.notes,
            footer_text: arrangement.footer_text,
            footer_image_url: arrangement.footer_image_url
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        arrangementId = newArrangement.id;
      } else {
        // Update existing arrangement
        const { error: updateError } = await supabase
          .from('digital_work_arrangements')
          .update({
            notes: arrangement.notes,
            footer_text: arrangement.footer_text,
            footer_image_url: arrangement.footer_image_url
          })
          .eq('id', arrangementId);
        
        if (updateError) throw updateError;
      }
      
      // Delete existing shifts and custom rows
      await supabase
        .from('digital_shifts')
        .delete()
        .eq('arrangement_id', arrangementId);
      
      await supabase
        .from('digital_shift_custom_rows')
        .delete()
        .eq('arrangement_id', arrangementId);
      
      // Insert shifts
      if (arrangement.shifts.length > 0) {
        const shiftsToInsert = arrangement.shifts.map((shift, index) => ({
          arrangement_id: arrangementId,
          section_name: shift.section_name,
          day_of_week: shift.day_of_week,
          shift_type: shift.shift_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          person_name: shift.person_name,
          is_custom_time: shift.is_custom_time,
          is_hidden: shift.is_hidden,
          position: index
        }));
        
        const { error: shiftsError } = await supabase
          .from('digital_shifts')
          .insert(shiftsToInsert);
        
        if (shiftsError) throw shiftsError;
      }
      
      // Insert custom rows
      if (arrangement.custom_rows.length > 0) {
        const rowsToInsert = arrangement.custom_rows.map((row, index) => ({
          arrangement_id: arrangementId,
          section_name: row.section_name,
          content: row.content,
          position: index
        }));
        
        const { error: rowsError } = await supabase
          .from('digital_shift_custom_rows')
          .insert(rowsToInsert);
        
        if (rowsError) throw rowsError;
      }
      
      // Fetch the updated arrangement
      const { data: updatedArrangement, error: fetchError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('id', arrangementId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Fetch shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from('digital_shifts')
        .select('*')
        .eq('arrangement_id', arrangementId)
        .order('position', { ascending: true });
      
      if (shiftsError) throw shiftsError;
      
      // Fetch custom rows
      const { data: customRows, error: customRowsError } = await supabase
        .from('digital_shift_custom_rows')
        .select('*')
        .eq('arrangement_id', arrangementId)
        .order('position', { ascending: true });
      
      if (customRowsError) throw customRowsError;
      
      setArrangement({
        id: updatedArrangement.id,
        week_start: updatedArrangement.week_start,
        notes: updatedArrangement.notes,
        footer_text: updatedArrangement.footer_text,
        footer_image_url: updatedArrangement.footer_image_url,
        shifts: shifts || [],
        custom_rows: customRows || []
      });
      
      toast({
        title: 'לוח משמרות נשמר בהצלחה',
        description: 'לוח המשמרות נשמר בהצלחה',
      });
    } catch (error) {
      console.error('Error saving arrangement:', error);
      toast({
        title: 'שגיאה בשמירת לוח משמרות',
        description: 'אירעה שגיאה בשמירת לוח המשמרות',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleShiftChange = (sectionName: string, dayOfWeek: number, shiftType: string, field: string, value: any) => {
    setArrangement(prev => {
      const newShifts = [...prev.shifts];
      const shiftIndex = newShifts.findIndex(
        s => s.section_name === sectionName && s.day_of_week === dayOfWeek && s.shift_type === shiftType
      );
      
      if (shiftIndex !== -1) {
        newShifts[shiftIndex] = {
          ...newShifts[shiftIndex],
          [field]: value,
          is_custom_time: field === 'start_time' || field === 'end_time' 
            ? true 
            : newShifts[shiftIndex].is_custom_time
        };
      }
      
      return { ...prev, shifts: newShifts };
    });
  };
  
  const handleShiftVisibility = (sectionName: string, dayOfWeek: number, shiftType: string, visible: boolean) => {
    setArrangement(prev => {
      const newShifts = [...prev.shifts];
      const shiftIndex = newShifts.findIndex(
        s => s.section_name === sectionName && s.day_of_week === dayOfWeek && s.shift_type === shiftType
      );
      
      if (shiftIndex !== -1) {
        newShifts[shiftIndex] = {
          ...newShifts[shiftIndex],
          is_hidden: !visible
        };
      }
      
      return { ...prev, shifts: newShifts };
    });
  };
  
  const handleAddCustomRow = (sectionName: string) => {
    setArrangement(prev => {
      const newCustomRows = [...prev.custom_rows];
      const position = newCustomRows
        .filter(row => row.section_name === sectionName)
        .length;
      
      newCustomRows.push({
        section_name: sectionName,
        content: '',
        position: position
      });
      
      return { ...prev, custom_rows: newCustomRows };
    });
  };
  
  const handleCustomRowChange = (index: number, content: string) => {
    setArrangement(prev => {
      const newCustomRows = [...prev.custom_rows];
      if (index >= 0 && index < newCustomRows.length) {
        newCustomRows[index] = {
          ...newCustomRows[index],
          content
        };
      }
      return { ...prev, custom_rows: newCustomRows };
    });
  };
  
  const handleDeleteCustomRow = (index: number) => {
    setArrangement(prev => {
      const newCustomRows = prev.custom_rows.filter((_, i) => i !== index);
      return { ...prev, custom_rows: newCustomRows };
    });
  };
  
  const handleAddShift = () => {
    if (!editingShift) return;
    
    setArrangement(prev => {
      const newShifts = [...prev.shifts];
      newShifts.push({
        ...editingShift,
        position: newShifts.length
      });
      
      return { ...prev, shifts: newShifts };
    });
    
    setEditingShift(null);
    setIsAddShiftDialogOpen(false);
  };
  
  // Render a time input cell
  const renderTimeInput = (sectionName: string, dayOfWeek: number, shiftType: string, timeType: 'start_time' | 'end_time') => {
    const shift = arrangement.shifts.find(
      s => s.section_name === sectionName && s.day_of_week === dayOfWeek && s.shift_type === shiftType
    );
    
    if (!shift) return null;
    
    return (
      <Input
        type="time"
        value={shift[timeType]}
        onChange={(e) => handleShiftChange(sectionName, dayOfWeek, shiftType, timeType, e.target.value)}
        className={`w-20 text-center px-1 ${shift.is_custom_time ? 'bg-yellow-100 font-bold' : ''}`}
      />
    );
  };
  
  // Render a name input cell
  const renderNameInput = (sectionName: string, dayOfWeek: number, shiftType: string) => {
    const shift = arrangement.shifts.find(
      s => s.section_name === sectionName && s.day_of_week === dayOfWeek && s.shift_type === shiftType
    );
    
    if (!shift) return null;
    
    if (shift.is_hidden) {
      return (
        <div className="flex items-center justify-center">
          <Button variant="ghost" size="sm" onClick={() => handleShiftVisibility(sectionName, dayOfWeek, shiftType, true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-1">
          {renderTimeInput(sectionName, dayOfWeek, shiftType, 'start_time')}
          <span>-</span>
          {renderTimeInput(sectionName, dayOfWeek, shiftType, 'end_time')}
        </div>
        <Input
          value={shift.person_name || ''}
          onChange={(e) => handleShiftChange(sectionName, dayOfWeek, shiftType, 'person_name', e.target.value)}
          placeholder="שם העובד/ת"
          className="w-full text-center"
        />
        <Button variant="ghost" size="sm" onClick={() => handleShiftVisibility(sectionName, dayOfWeek, shiftType, false)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">לוח משמרות דיגיטל</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">טוען...</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="digital-work-arrangement">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <div>
              <CardTitle className="text-center md:text-right">לוח משמרות דיגיטל</CardTitle>
              <div className="text-center md:text-right">{formatDateRange()}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="h-4 w-4 ml-2" />
                תצוגה מקדימה
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 ml-2" />
                {isSaving ? 'שומר...' : 'שמור לוח משמרות'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Digital Shifts Table */}
          <div className="bg-white rounded-md overflow-x-auto">
            <Table className="border">
              <TableHeader>
                <TableRow className="bg-black text-white">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <TableHead key={day} className="text-center text-white border">
                      <div>{day}</div>
                      <div className="text-sm">{weekDates[index]}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Morning shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => (
                    <TableCell key={`morning-${day}`} className="p-2 border text-center">
                      {renderNameInput(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.MORNING)}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Afternoon shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => (
                    <TableCell key={`afternoon-${day}`} className="p-2 border text-center">
                      {renderNameInput(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON)}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Evening shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => {
                    // Only render evening shift for Sunday-Thursday (0-4)
                    if (day === 5) { // Friday
                      return <TableCell key={`evening-${day}`} className="border"></TableCell>;
                    }
                    return (
                      <TableCell key={`evening-${day}`} className="p-2 border text-center">
                        {renderNameInput(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.EVENING)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Radio North Table */}
          <div className="overflow-x-auto">
            <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.RADIO_NORTH]}</div>
            <Table className="border">
              <TableBody>
                <TableRow>
                  {[...Array(5)].map((_, day) => (
                    <TableCell key={`radio-north-${day}`} className="p-2 border text-center">
                      {renderNameInput(SECTION_NAMES.RADIO_NORTH, day, SHIFT_TYPES.CUSTOM)}
                    </TableCell>
                  ))}
                  <TableCell className="border"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Transcription Shifts Table */}
          <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-2">
              <div className="font-bold">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAddCustomRow(SECTION_NAMES.TRANSCRIPTION_SHIFTS)}
              >
                <Plus className="h-4 w-4 ml-1" />
                הוסף שורה
              </Button>
            </div>
            <Table className="border">
              <TableBody>
                {/* Morning shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => (
                    <TableCell key={`transcription-morning-${day}`} className="p-2 border text-center">
                      {renderNameInput(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.MORNING)}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Afternoon shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => {
                    // Only render afternoon shift for Sunday-Thursday (0-4)
                    if (day === 5) { // Friday
                      return <TableCell key={`transcription-afternoon-${day}`} className="border"></TableCell>;
                    }
                    return (
                      <TableCell key={`transcription-afternoon-${day}`} className="p-2 border text-center">
                        {renderNameInput(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.AFTERNOON)}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {/* Custom rows */}
                {arrangement.custom_rows
                  .filter(row => row.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS)
                  .map((row, index) => (
                    <TableRow key={`transcription-custom-${index}`}>
                      <TableCell colSpan={6} className="p-2 border">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.content || ''}
                            onChange={(e) => handleCustomRowChange(
                              arrangement.custom_rows.findIndex(r => r === row),
                              e.target.value
                            )}
                            placeholder="הזן טקסט חופשי..."
                            className="w-full"
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCustomRow(
                              arrangement.custom_rows.findIndex(r => r === row)
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Live Social Shifts Table */}
          <div className="overflow-x-auto">
            <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
            <Table className="border">
              <TableBody>
                {/* Morning shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => (
                    <TableCell key={`live-social-morning-${day}`} className="p-2 border text-center">
                      {renderNameInput(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.MORNING)}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Afternoon shift row */}
                <TableRow>
                  {[...Array(6)].map((_, day) => {
                    // Only render afternoon shift for Sunday-Thursday (0-4)
                    if (day === 5) { // Friday
                      return <TableCell key={`live-social-afternoon-${day}`} className="border"></TableCell>;
                    }
                    return (
                      <TableCell key={`live-social-afternoon-${day}`} className="p-2 border text-center">
                        {renderNameInput(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          {/* Footer Section */}
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="footer-text">הערות</Label>
              <Textarea 
                id="footer-text"
                value={arrangement.footer_text || ''}
                onChange={(e) => setArrangement(prev => ({ ...prev, footer_text: e.target.value }))}
                placeholder="הערות או מידע נוסף..."
                className="h-24"
              />
            </div>
            
            <div>
              <Label htmlFor="footer-image">תמונה לתחתית המסמך (URL)</Label>
              <Input 
                id="footer-image"
                value={arrangement.footer_image_url || ''}
                onChange={(e) => setArrangement(prev => ({ ...prev, footer_image_url: e.target.value }))}
                placeholder="הכנס קישור לתמונה..."
              />
              {arrangement.footer_image_url && (
                <div className="mt-2 p-2 border rounded">
                  <img 
                    src={arrangement.footer_image_url} 
                    alt="תמונת כותרת תחתונה"
                    className="max-h-40 mx-auto object-contain" 
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Shift Dialog */}
      <Dialog open={isAddShiftDialogOpen} onOpenChange={setIsAddShiftDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>הוספת משמרת</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift-section" className="text-right">מחלקה</Label>
              <select
                id="shift-section"
                className="col-span-3"
                value={editingShift?.section_name || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev!, section_name: e.target.value }))}
              >
                <option value={SECTION_NAMES.DIGITAL_SHIFTS}>דיגיטל</option>
                <option value={SECTION_NAMES.RADIO_NORTH}>רדיו צפון</option>
                <option value={SECTION_NAMES.TRANSCRIPTION_SHIFTS}>תמלולים</option>
                <option value={SECTION_NAMES.LIVE_SOCIAL_SHIFTS}>לייבים וסושיאל</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift-day" className="text-right">יום</Label>
              <select
                id="shift-day"
                className="col-span-3"
                value={editingShift?.day_of_week || 0}
                onChange={(e) => setEditingShift(prev => ({ ...prev!, day_of_week: parseInt(e.target.value) }))}
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift-type" className="text-right">סוג משמרת</Label>
              <select
                id="shift-type"
                className="col-span-3"
                value={editingShift?.shift_type || SHIFT_TYPES.MORNING}
                onChange={(e) => setEditingShift(prev => ({ ...prev!, shift_type: e.target.value }))}
              >
                <option value={SHIFT_TYPES.MORNING}>בוקר</option>
                <option value={SHIFT_TYPES.AFTERNOON}>צהריים</option>
                <option value={SHIFT_TYPES.EVENING}>ערב</option>
                <option value={SHIFT_TYPES.CUSTOM}>אחר</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift-start" className="text-right">שעת התחלה</Label>
              <Input
                id="shift-start"
                type="time"
                className="col-span-3"
                value={editingShift?.start_time || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev!, start_time: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift-end" className="text-right">שעת סיום</Label>
              <Input
                id="shift-end"
                type="time"
                className="col-span-3"
                value={editingShift?.end_time || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev!, end_time: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shift-person" className="text-right">שם העובד/ת</Label>
              <Input
                id="shift-person"
                className="col-span-3"
                value={editingShift?.person_name || ''}
                onChange={(e) => setEditingShift(prev => ({ ...prev!, person_name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddShift}>הוסף משמרת</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה</DialogTitle>
          </DialogHeader>
          <div className="digital-work-arrangement-view">
            <h2 className="text-2xl font-bold text-center mb-2">לוח משמרות דיגיטל</h2>
            <div className="text-center mb-4">{formatDateRange()}</div>
            
            {/* Digital Shifts Table */}
            <div className="mb-6 overflow-x-auto">
              <Table className="border w-full">
                <TableHeader>
                  <TableRow className="bg-black text-white">
                    {DAYS_OF_WEEK.map((day, index) => (
                      <TableHead key={day} className="text-center text-white border">
                        <div>{day}</div>
                        <div className="text-sm">{weekDates[index]}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Morning shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.DIGITAL_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.MORNING
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`morning-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`morning-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {/* Afternoon shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.DIGITAL_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.AFTERNOON
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`afternoon-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {/* Evening shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      if (day === 5) {
                        return <TableCell key={`evening-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.DIGITAL_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.EVENING
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`evening-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`evening-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {/* Radio North Table */}
            <div className="mb-6 overflow-x-auto">
              <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.RADIO_NORTH]}</div>
              <Table className="border w-full">
                <TableBody>
                  <TableRow>
                    {[...Array(5)].map((_, day) => {
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.RADIO_NORTH && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.CUSTOM
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`radio-north-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`radio-north-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-2 border text-center">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {/* Transcription Shifts Table */}
            <div className="mb-6 overflow-x-auto">
              <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
              <Table className="border w-full">
                <TableBody>
                  {/* Morning shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.MORNING
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`transcription-morning-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`transcription-morning-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {/* Afternoon shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      if (day === 5) {
                        return <TableCell key={`transcription-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.AFTERNOON
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`transcription-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`transcription-afternoon-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {/* Custom rows */}
                  {arrangement.custom_rows
                    .filter(row => row.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && row.content)
                    .map((row, index) => (
                      <TableRow key={`transcription-custom-${index}`}>
                        <TableCell colSpan={6} className="p-2 border text-center">
                          {row.content}
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Live Social Shifts Table */}
            <div className="mb-6 overflow-x-auto">
              <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
              <Table className="border w-full">
                <TableBody>
                  {/* Morning shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.LIVE_SOCIAL_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.MORNING
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`live-social-morning-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`live-social-morning-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {/* Afternoon shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      if (day === 5) {
                        return <TableCell key={`live-social-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      const shift = arrangement.shifts.find(
                        s => s.section_name === SECTION_NAMES.LIVE_SOCIAL_SHIFTS && 
                             s.day_of_week === day && 
                             s.shift_type === SHIFT_TYPES.AFTERNOON
                      );
                      
                      if (!shift || shift.is_hidden) {
                        return <TableCell key={`live-social-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                      }
                      
                      return (
                        <TableCell key={`live-social-afternoon-${day}`} className="p-2 border text-center">
                          <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                            <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
                          </div>
                          <div>{shift.person_name || '-'}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {/* Footer Section */}
            {(arrangement.footer_text || arrangement.footer_image_url) && (
              <div className="mt-8 space-y-4">
                {arrangement.footer_text && (
                  <div className="text-center whitespace-pre-line">
                    {arrangement.footer_text}
                  </div>
                )}
                
                {arrangement.footer_image_url && (
                  <div className="flex justify-center">
                    <img 
                      src={arrangement.footer_image_url} 
                      alt="תמונת כותרת תחתונה"
                      className="max-h-40 object-contain" 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DigitalWorkArrangementEditor;
