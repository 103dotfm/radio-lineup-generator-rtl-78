import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { Plus, Edit, Trash2, MoreHorizontal, Clock } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { Worker, getWorkers } from '@/lib/supabase/workers';

// Types for our data structures
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
  contents: Record<number, string>; // Day index -> content mapping
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
}

// Constants for section and shift types
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
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDate, setWeekDate] = useState<Date>(new Date());
  const [currentSection, setCurrentSection] = useState(SECTION_NAMES.DIGITAL_SHIFTS);
  
  // Dialogs state
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [customRowDialogOpen, setCustomRowDialogOpen] = useState(false);
  const [footerTextDialogOpen, setFooterTextDialogOpen] = useState(false);
  
  // Edit mode state
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingCustomRow, setEditingCustomRow] = useState<CustomRow | null>(null);
  const [customRowContent, setCustomRowContent] = useState<Record<number, string>>({});
  const [footerText, setFooterText] = useState('');
  
  // New shift data
  const [newShiftData, setNewShiftData] = useState({
    section_name: SECTION_NAMES.DIGITAL_SHIFTS,
    day_of_week: 0,
    shift_type: SHIFT_TYPES.MORNING,
    start_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].start,
    end_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].end,
    person_name: '',
    additional_text: '',
    is_custom_time: false,
    is_hidden: false
  });

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = '';
      const strayDivs = document.querySelectorAll('div[id^="cbcb"]');
      strayDivs.forEach(div => div.remove());
    };
  }, []);

  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const workersList = await getWorkers();
        setWorkers(workersList);
      } catch (error) {
        console.error('Error loading workers:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את רשימת העובדים",
          variant: "destructive"
        });
      }
    };
    
    loadWorkers();
  }, [toast]);

  useEffect(() => {
    fetchArrangement();
  }, [weekDate]);

  const fetchArrangement = async () => {
    setLoading(true);
    const weekStartStr = format(weekDate, 'yyyy-MM-dd');
    
    try {
      const { data: arrangementData, error: arrangementError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr);
      
      if (arrangementError) {
        throw arrangementError;
      }
      
      if (arrangementData && arrangementData.length > 0) {
        const firstArrangement = arrangementData[0];
        setArrangement(firstArrangement);
        setFooterText(firstArrangement.footer_text || '');
        
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .order('position', { ascending: true });
        
        if (shiftsError) {
          throw shiftsError;
        }
        
        setShifts(shiftsData || []);
        
        const { data: customRowsData, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .order('position', { ascending: true });
          
        if (customRowsError) {
          throw customRowsError;
        }
        
        const processedCustomRows = customRowsData?.map(row => {
          let contents: Record<number, string> = {};
          
          try {
            if (row.contents) {
              if (typeof row.contents === 'string') {
                try {
                  contents = JSON.parse(row.contents);
                } catch {
                  contents = {};
                }
              } else if (typeof row.contents === 'object') {
                Object.entries(row.contents).forEach(([key, value]) => {
                  if (value !== null && value !== undefined) {
                    contents[Number(key)] = String(value);
                  } else {
                    contents[Number(key)] = '';
                  }
                });
              }
            }
          } catch (e) {
            console.error('Error parsing contents', e);
          }
          
          return {
            id: row.id,
            section_name: row.section_name,
            contents: contents,
            position: row.position
          };
        }) || [];
        
        setCustomRows(processedCustomRows);
      } else {
        const { data: newArrangement, error: createError } = await supabase
          .from('digital_work_arrangements')
          .insert([{
            week_start: weekStartStr,
            notes: null,
            footer_text: null,
            footer_image_url: null
          }])
          .select()
          .single();
        
        if (createError) {
          throw createError;
        }
        
        setArrangement(newArrangement);
        setShifts([]);
        setCustomRows([]);
      }
    } catch (error) {
      console.error('Error fetching digital work arrangement:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את סידור העבודה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async () => {
    if (!arrangement) return;
    
    try {
      if (editingShift) {
        const { error } = await supabase
          .from('digital_shifts')
          .update({
            section_name: newShiftData.section_name,
            day_of_week: newShiftData.day_of_week,
            shift_type: newShiftData.shift_type,
            start_time: newShiftData.start_time,
            end_time: newShiftData.end_time,
            person_name: newShiftData.person_name || null,
            additional_text: newShiftData.additional_text || null,
            is_custom_time: newShiftData.is_custom_time,
            is_hidden: newShiftData.is_hidden
          })
          .eq('id', editingShift.id);
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "המשמרת עודכנה בהצלחה"
        });
      } else {
        const position = shifts
          .filter(s => s.section_name === newShiftData.section_name && 
                      s.day_of_week === newShiftData.day_of_week && 
                      s.shift_type === newShiftData.shift_type)
          .length;
        
        const { error } = await supabase
          .from('digital_shifts')
          .insert({
            arrangement_id: arrangement.id,
            section_name: newShiftData.section_name,
            day_of_week: newShiftData.day_of_week,
            shift_type: newShiftData.shift_type,
            start_time: newShiftData.start_time,
            end_time: newShiftData.end_time,
            person_name: newShiftData.person_name || null,
            additional_text: newShiftData.additional_text || null,
            is_custom_time: newShiftData.is_custom_time,
            is_hidden: newShiftData.is_hidden,
            position: position
          });
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "המשמרת נוצרה בהצלחה"
        });
      }
      
      fetchArrangement();
      setShiftDialogOpen(false);
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את המשמרת",
        variant: "destructive"
      });
    }
  };

  const handleSaveCustomRow = async () => {
    if (!arrangement) return;
    
    try {
      if (editingCustomRow) {
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .update({
            section_name: currentSection,
            contents: customRowContent
          })
          .eq('id', editingCustomRow.id);
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "השורה עודכנה בהצלחה"
        });
      } else {
        const position = customRows
          .filter(r => r.section_name === currentSection)
          .length;
        
        const { error } = await supabase
          .from('digital_shift_custom_rows')
          .insert({
            arrangement_id: arrangement.id,
            section_name: currentSection,
            contents: customRowContent,
            position: position
          });
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "השורה נוצרה בהצלחה"
        });
      }
      
      fetchArrangement();
      setCustomRowDialogOpen(false);
    } catch (error) {
      console.error('Error saving custom row:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את השורה",
        variant: "destructive"
      });
    }
  };

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

  const handleSaveFooterText = async () => {
    if (!arrangement) return;
    
    try {
      const { error } = await supabase
        .from('digital_work_arrangements')
        .update({ footer_text: footerText })
        .eq('id', arrangement.id);
      
      if (error) throw error;
      
      toast({
        title: "בוצע",
        description: "הטקסט עודכן בהצלחה"
      });
      setFooterTextDialogOpen(false);
    } catch (error) {
      console.error('Error updating footer text:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הטקסט",
        variant: "destructive"
      });
    }
  };

  const openShiftDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setNewShiftData({
        section_name: shift.section_name,
        day_of_week: shift.day_of_week,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        person_name: shift.person_name || '',
        additional_text: shift.additional_text || '',
        is_custom_time: shift.is_custom_time,
        is_hidden: shift.is_hidden
      });
    } else {
      setEditingShift(null);
      setNewShiftData({
        section_name: currentSection,
        day_of_week: 0,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].start,
        end_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].end,
        person_name: '',
        additional_text: '',
        is_custom_time: false,
        is_hidden: false
      });
    }
    setShiftDialogOpen(true);
  };

  const openCustomRowDialog = (row?: CustomRow) => {
    if (row) {
      setEditingCustomRow(row);
      setCustomRowContent(row.contents);
    } else {
      setEditingCustomRow(null);
      const initialContents: Record<number, string> = {};
      for (let i = 0; i < 6; i++) {
        initialContents[i] = '';
      }
      setCustomRowContent(initialContents);
    }
    setCustomRowDialogOpen(true);
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

  const [pendingCustomCellUpdates, setPendingCustomCellUpdates] = useState<Record<string, any>>({});
  const [cellFocused, setCellFocused] = useState<string | null>(null);

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
            onClick={() => {
              setNewShiftData({
                ...newShiftData,
                section_name: section,
                day_of_week: day,
                shift_type: shiftType,
                start_time: DEFAULT_SHIFT_TIMES[shiftType].start,
                end_time: DEFAULT_SHIFT_TIMES[shiftType].end,
              });
              setEditingShift(null);
              setShiftDialogOpen(true);
            }}
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
              <div className={`text-xs ${shift.is_custom_time ? 'font-bold' : ''}`}>
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
              onClick={() => {
                setCurrentSection(section);
                openCustomRowDialog();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              הוסף שורה מותאמת אישית
            </Button>
          </TableCell>
        </TableRow>
      );
    }
    
    return rows.map((row) => (
      <TableRow key={row.id}>
        {[0, 1, 2, 3, 4, 5].map((day) => (
          <TableCell key={`${row.id}-${day}`} className="p-2 border text-center">
            <div className="relative min-h-[60px]">
              <textarea
                value={row.contents[day] || ''}
                onChange={(e) => updateCustomCellContent(row.id, day, e.target.value)}
                onFocus={() => setCellFocused(`${row.id}-${day}`)}
                onBlur={() => saveCustomCellContent(row.id, day)}
                className="w-full h-full min-h-[60px] p-2 resize-none border rounded bg-background"
                placeholder="הזן טקסט..."
              />
              
              <div className="absolute top-1 right-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border border-border">
                    <DropdownMenuItem onClick={() => openCustomRowDialog(row)}>
                      <Edit className="mr-2 h-4 w-4" />
                      ערוך
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteCustomRow(row.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      מחק
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const formatDateRange = () => {
    const startDay = format(weekDate, 'dd', { locale: he });
    const endDate = new Date(weekDate);
    endDate.setDate(endDate.getDate() + 5);
    const endDay = format(endDate, 'dd', { locale: he });
    const month = format(weekDate, 'MMMM yyyy', { locale: he });
    return `${endDay}-${startDay} ב${month}`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">עורך סידור עבודה דיגיטל</h2>
        <div className="flex items-center gap-2">
          <DatePicker 
            date={weekDate}
            onSelect={(date) => date && setWeekDate(date)}
          />
          <div className="text-sm font-medium">{formatDateRange()}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <p>טוען נתונים...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap space-x-2 space-x-reverse mb-4">
            {Object.entries(SECTION_TITLES).map(([key, title]) => (
              <Button
                key={key}
                variant={currentSection === key ? "default" : "outline"}
                onClick={() => setCurrentSection(key)}
                className="mb-2"
              >
                {title}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap space-x-2 space-x-reverse mb-4">
            <Button onClick={() => setFooterTextDialogOpen(true)}>
              {arrangement?.footer_text ? 'ערוך טקסט תחתון' : 'הוסף טקסט תחתון'}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">משמרת</TableHead>
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
                      <TableCell className="font-medium">{label}</TableCell>
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
            </CardContent>
          </Card>

          <Dialog open={shiftDialogOpen} onOpenChange={(open) => {
            setShiftDialogOpen(open);
            if (!open) {
              document.body.style.pointerEvents = '';
            }
          }}>
            <DialogContent className="sm:max-w-[425px] bg-background" 
              onEscapeKeyDown={() => setShiftDialogOpen(false)}
              onPointerDownOutside={() => setShiftDialogOpen(false)}
              onInteractOutside={(e) => {
                e.preventDefault();
                setShiftDialogOpen(false);
              }}
              dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? 'עריכת משמרת' : 'הוספת משמרת חדשה'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="shift-section">סקשן</Label>
                  <Select
                    value={newShiftData.section_name}
                    onValueChange={(value) => setNewShiftData({...newShiftData, section_name: value})}
                  >
                    <SelectTrigger className="col-span-3 bg-background">
                      <SelectValue placeholder="בחר סקשן" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {Object.entries(SECTION_TITLES).map(([key, title]) => (
                        <SelectItem key={key} value={key}>{title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="shift-day">יום</Label>
                  <Select
                    value={newShiftData.day_of_week.toString()}
                    onValueChange={(value) => setNewShiftData({...newShiftData, day_of_week: parseInt(value)})}
                  >
                    <SelectTrigger className="col-span-3 bg-background">
                      <SelectValue placeholder="בחר יום" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {DAYS_OF_WEEK.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="shift-type">סוג משמרת</Label>
                  <Select
                    value={newShiftData.shift_type}
                    onValueChange={(value) => {
                      setNewShiftData({
                        ...newShiftData, 
                        shift_type: value,
                        start_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES].start,
                        end_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES].end,
                      });
                    }}
                  >
                    <SelectTrigger className="col-span-3 bg-background">
                      <SelectValue placeholder="בחר סוג משמרת" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => (
                        <SelectItem key={type} value={type}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="start-time">שעת התחלה</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newShiftData.start_time}
                    onChange={(e) => setNewShiftData({...newShiftData, start_time: e.target.value})}
                    className="col-span-3 bg-background"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="end-time">שעת סיום</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newShiftData.end_time}
                    onChange={(e) => setNewShiftData({...newShiftData, end_time: e.target.value})}
                    className="col-span-3 bg-background"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="person-name">עובד</Label>
                  <div className="col-span-3">
                    <WorkerSelector 
                      value={newShiftData.person_name || null}
                      onChange={(value, additionalText) => 
                        setNewShiftData({
                          ...newShiftData, 
                          person_name: value || '', 
                          additional_text: additionalText || ''
                        })
                      }
                      additionalText={newShiftData.additional_text}
                      placeholder="בחר עובד..."
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="is-custom-time" 
                    checked={newShiftData.is_custom_time}
                    onCheckedChange={(checked) => 
                      setNewShiftData({...newShiftData, is_custom_time: checked === true})
                    }
                  />
                  <Label htmlFor="is-custom-time">הדגש שעות מותאמות אישית</Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="is-hidden" 
                    checked={newShiftData.is_hidden}
                    onCheckedChange={(checked) => 
                      setNewShiftData({...newShiftData, is_hidden: checked === true})
                    }
                  />
                  <Label htmlFor="is-hidden">הסתר משמרת</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveShift}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={customRowDialogOpen} onOpenChange={(open) => {
            setCustomRowDialogOpen(open);
            if (!open) {
              document.body.style.pointerEvents = '';
            }
          }}>
            <DialogContent className="max-w-4xl bg-background" 
              onEscapeKeyDown={() => setCustomRowDialogOpen(false)}
              onPointerDownOutside={() => setCustomRowDialogOpen(false)}
              onInteractOutside={(e) => {
                e.preventDefault();
                setCustomRowDialogOpen(false);
              }}
              dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomRow ? 'עריכת שורה מותאמת אישית' : 'הוספת שורה מותאמת אישית'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-6 gap-4 py-4">
                {[0, 1, 2, 3, 4, 5].map((day) => (
                  <div key={day} className="flex flex-col">
                    <Label className="mb-2 text-center">{DAYS_OF_WEEK[day]}</Label>
                    <Textarea
                      value={customRowContent[day] || ''}
                      onChange={(e) => setCustomRowContent({...customRowContent, [day]: e.target.value})}
                      className="min-h-[100px] bg-background"
                      placeholder="הזן טקסט..."
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveCustomRow}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={footerTextDialogOpen} onOpenChange={(open) => {
            setFooterTextDialogOpen(open);
            if (!open) {
              document.body.style.pointerEvents = '';
            }
          }}>
            <DialogContent className="bg-background" 
              onEscapeKeyDown={() => setFooterTextDialogOpen(false)}
              onPointerDownOutside={() => setFooterTextDialogOpen(false)}
              onInteractOutside={(e) => {
                e.preventDefault();
                setFooterTextDialogOpen(false);
              }}
              dir="rtl">
              <DialogHeader>
                <DialogTitle>טקסט תחתון</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="הזן טקסט תחתון..."
                  className="min-h-[200px] bg-background"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleSaveFooterText}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default DigitalWorkArrangementEditor;
