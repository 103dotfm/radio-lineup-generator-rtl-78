import React, { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, addDays } from 'date-fns';
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
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MoreHorizontal, Clock, ChevronLeft, ChevronRight, Calendar, Eye, Printer, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { CustomRowColumns } from '@/components/schedule/workers/CustomRowColumns';
import DigitalWorkArrangementView from '@/components/schedule/DigitalWorkArrangementView';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Worker } from '@/lib/supabase/workers';

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
  [SHIFT_TYPES.MORNING]: {
    start: '07:00',
    end: '12:00'
  },
  [SHIFT_TYPES.AFTERNOON]: {
    start: '12:00',
    end: '21:00'
  },
  [SHIFT_TYPES.EVENING]: {
    start: '17:00',
    end: '21:00'
  },
  [SHIFT_TYPES.CUSTOM]: {
    start: '12:00',
    end: '15:00'
  }
};
const DigitalWorkArrangementEditor: React.FC = () => {
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [loading, setLoading] = useState(true);
  const [weekDate, setWeekDate] = useState<Date>(() => {
    return startOfWeek(new Date(), {
      weekStartsOn: 0
    });
  });
  const [currentSection, setCurrentSection] = useState(SECTION_NAMES.DIGITAL_SHIFTS);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [customRowDialogOpen, setCustomRowDialogOpen] = useState(false);
  const [footerTextDialogOpen, setFooterTextDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingCustomRow, setEditingCustomRow] = useState<CustomRow | null>(null);
  const [customRowContent, setCustomRowContent] = useState<Record<number, string>>({});
  const [footerText, setFooterText] = useState('');
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
  const [previewMode, setPreviewMode] = useState(false);
  const {
    toast
  } = useToast();
  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekDate(prev => {
      const newDate = direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return startOfWeek(newDate, {
        weekStartsOn: 0
      });
    });
  };
  useEffect(() => {
    return () => {
      // Always ensure pointer events are cleared on unmount
      document.body.style.pointerEvents = '';
      document.body.style.pointerEvents = 'auto';
      const strayDivs = document.querySelectorAll('div[id^="cbcb"]');
      strayDivs.forEach(div => div.remove());
    };
  }, []);

  // Add a global cleanup effect that runs whenever dialogs close
  useEffect(() => {
    const cleanupPointerEvents = () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
        document.body.style.pointerEvents = 'auto';
      }
    };

    // Clean up when any dialog state changes
    if (!shiftDialogOpen && !customRowDialogOpen && !footerTextDialogOpen) {
      cleanupPointerEvents();
    }
  }, [shiftDialogOpen, customRowDialogOpen, footerTextDialogOpen]);

  useEffect(() => {
    fetchArrangement();
    fetchDigitalWorkers();
  }, [weekDate]);

  const fetchDigitalWorkers = async () => {
    try {
      // Get all workers and filter those who work in digital department
      const { data: allWorkers, error } = await api.query('/workers');
      if (error) throw error;
      
      const digitalWorkers = allWorkers.filter((worker: Worker) => 
        worker.department && worker.department.includes('digital')
      );
      setWorkers(digitalWorkers || []);
    } catch (error) {
      console.error('Error fetching digital workers:', error);
    }
  };

  const createDefaultShifts = async (arrangementId: string) => {
    try {
      // Check if shifts already exist for this arrangement
      const { data: existingShifts, error: fetchError } = await api.query('/digital-shifts', {
        where: { arrangement_id: arrangementId }
      });

      if (fetchError) {
        console.error('Error fetching existing shifts:', fetchError);
        return;
      }

      // Check which sections already have shifts
      const sectionsWithShifts = new Set();
      if (existingShifts && existingShifts.length > 0) {
        existingShifts.forEach(shift => {
          sectionsWithShifts.add(shift.section_name);
        });
      }

      // If all sections already have shifts, don't create duplicates
      const allSections = [
        SECTION_NAMES.DIGITAL_SHIFTS,
        SECTION_NAMES.RADIO_NORTH,
        SECTION_NAMES.TRANSCRIPTION_SHIFTS,
        SECTION_NAMES.LIVE_SOCIAL_SHIFTS
      ];
      
      const sectionsNeedingShifts = allSections.filter(section => !sectionsWithShifts.has(section));
      
      if (sectionsNeedingShifts.length === 0) {
        console.log('All sections already have shifts for this arrangement');
        return;
      }

      console.log('Creating default shifts for sections:', sectionsNeedingShifts);

      const defaultShifts = [];
      let position = 0;

      // Create shifts for each section and day (Sunday to Friday)
      for (let day = 0; day < 6; day++) {
        // Digital Shifts section - Morning and Afternoon shifts
        if (sectionsNeedingShifts.includes(SECTION_NAMES.DIGITAL_SHIFTS)) {
          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.DIGITAL_SHIFTS,
            day_of_week: day,
            shift_type: SHIFT_TYPES.MORNING,
            start_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].start,
            end_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.MORNING].end,
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });

          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.DIGITAL_SHIFTS,
            day_of_week: day,
            shift_type: SHIFT_TYPES.AFTERNOON,
            start_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.AFTERNOON].start,
            end_time: DEFAULT_SHIFT_TIMES[SHIFT_TYPES.AFTERNOON].end,
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });
        }

        // Radio North section - Morning shift only
        if (sectionsNeedingShifts.includes(SECTION_NAMES.RADIO_NORTH)) {
          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.RADIO_NORTH,
            day_of_week: day,
            shift_type: SHIFT_TYPES.MORNING,
            start_time: '09:00',
            end_time: '12:00',
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });
        }

        // Transcription Shifts section - Morning and Afternoon shifts
        if (sectionsNeedingShifts.includes(SECTION_NAMES.TRANSCRIPTION_SHIFTS)) {
          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
            day_of_week: day,
            shift_type: SHIFT_TYPES.MORNING,
            start_time: '07:00',
            end_time: '14:00',
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });

          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
            day_of_week: day,
            shift_type: SHIFT_TYPES.AFTERNOON,
            start_time: '14:00',
            end_time: '20:00',
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });
        }

        // Live Social Shifts section - Morning and Afternoon shifts
        if (sectionsNeedingShifts.includes(SECTION_NAMES.LIVE_SOCIAL_SHIFTS)) {
          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
            day_of_week: day,
            shift_type: SHIFT_TYPES.MORNING,
            start_time: '07:00',
            end_time: '14:00',
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });

          defaultShifts.push({
            arrangement_id: arrangementId,
            section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
            day_of_week: day,
            shift_type: SHIFT_TYPES.AFTERNOON,
            start_time: '14:00',
            end_time: '20:00',
            person_name: null,
            additional_text: null,
            is_custom_time: false,
            is_hidden: false,
            position: position++
          });
        }
      }

      // Create all default shifts
      for (const shift of defaultShifts) {
        const { error } = await api.mutate('/digital-shifts', shift, 'POST');
        if (error) {
          console.error('Error creating default shift:', error);
        }
      }

      console.log('Default shifts created successfully');
    } catch (error) {
      console.error('Error creating default shifts:', error);
    }
  };

  const fetchArrangement = async () => {
    setLoading(true);
    const weekStartStr = format(weekDate, 'yyyy-MM-dd');
    try {
      // Get or create arrangement
      const { data: arrangementData, error: arrangementError } = await api.query('/digital-work-arrangements', {
        where: { week_start: weekStartStr },
        single: true
      });

      if (arrangementError) {
        throw arrangementError;
      }

      let currentArrangement;
      if (arrangementData) {
        currentArrangement = arrangementData;
      } else {
        // Create new arrangement
        const { data: newArrangement, error: createError } = await api.mutate('/digital-work-arrangements', {
          week_start: weekStartStr,
          notes: null,
          footer_text: null,
          footer_image_url: null
        }, 'POST');

        if (createError) throw createError;
        currentArrangement = newArrangement;

        // Create default shifts for digital section
        await createDefaultShifts(currentArrangement.id);
      }

      setArrangement(currentArrangement);
      setFooterText(currentArrangement.footer_text || '');

      // Get shifts
      const { data: shiftsData, error: shiftsError } = await api.query('/digital-shifts', {
        where: { arrangement_id: currentArrangement.id },
        order: { position: 'asc' }
      });

      if (shiftsError) throw shiftsError;
      let shifts = shiftsData || [];

      // Check if any sections are missing shifts and create defaults automatically
      const sectionsWithShifts = new Set(shifts.map(shift => shift.section_name));
      const allSections = [
        SECTION_NAMES.DIGITAL_SHIFTS,
        SECTION_NAMES.RADIO_NORTH,
        SECTION_NAMES.TRANSCRIPTION_SHIFTS,
        SECTION_NAMES.LIVE_SOCIAL_SHIFTS
      ];
      
      const sectionsNeedingShifts = allSections.filter(section => !sectionsWithShifts.has(section));
      
      if (sectionsNeedingShifts.length > 0) {
        console.log('Creating default shifts for missing sections:', sectionsNeedingShifts);
        await createDefaultShifts(currentArrangement.id);
        // Fetch shifts again after creating defaults
        const { data: updatedShiftsData, error: updatedShiftsError } = await api.query('/digital-shifts', {
          where: { arrangement_id: currentArrangement.id },
          order: { position: 'asc' }
        });
        if (!updatedShiftsError) {
          shifts = updatedShiftsData || [];
        }
      }

      setShifts(shifts);

      // Get custom rows
      const { data: customRowsData, error: customRowsError } = await api.query('/digital-shift-custom-rows', {
        where: { arrangement_id: currentArrangement.id },
        order: { position: 'asc' }
      });

      if (customRowsError) throw customRowsError;

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
        const {
          error
        } = await api.mutate(`/digital-shifts/${editingShift.id}`, {
          section_name: newShiftData.section_name,
          day_of_week: newShiftData.day_of_week,
          shift_type: newShiftData.shift_type,
          start_time: newShiftData.start_time,
          end_time: newShiftData.end_time,
          person_name: newShiftData.person_name || null,
          additional_text: newShiftData.additional_text || null,
          is_custom_time: newShiftData.is_custom_time,
          is_hidden: newShiftData.is_hidden
        }, 'PUT');
        if (error) throw error;
        toast({
          title: "בוצע",
          description: "המשמרת עודכנה בהצלחה"
        });
      } else {
        const position = shifts.filter(s => s.section_name === newShiftData.section_name && s.day_of_week === newShiftData.day_of_week && s.shift_type === newShiftData.shift_type).length;
        const {
          error
        } = await api.mutate('/digital-shifts', {
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
        }, 'POST');
        if (error) throw error;
        toast({
          title: "בוצע",
          description: "המשמרת נוצרה בהצלחה"
        });
      }
      fetchArrangement();
      closeShiftDialog();
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
        const {
          error
        } = await api.mutate('/digital-shift-custom-rows', {
          id: editingCustomRow.id,
          section_name: currentSection,
          contents: customRowContent
        }, 'PUT');
        if (error) throw error;
        toast({
          title: "בוצע",
          description: "השורה עודכנה בהצלחה"
        });
      } else {
        const position = customRows.filter(r => r.section_name === currentSection).length;
        const {
          error
        } = await api.mutate('/digital-shift-custom-rows', {
          arrangement_id: arrangement.id,
          section_name: currentSection,
          contents: customRowContent,
          position: position
        }, 'POST');
        if (error) throw error;
        toast({
          title: "בוצע",
          description: "השורה נוצרה בהצלחה"
        });
      }
      fetchArrangement();
      closeCustomRowDialog();
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
      const {
        error
      } = await api.mutate(`/digital-shifts/${id}`, {}, 'DELETE');
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
      const {
        error
      } = await api.mutate(`/digital-shift-custom-rows/${id}`, {}, 'DELETE');
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
      const {
        error
      } = await api.mutate(`/digital-work-arrangements/${arrangement.id}`, {
        footer_text: footerText
      }, 'PUT');
      if (error) throw error;
      toast({
        title: "בוצע",
        description: "הטקסט עודכן בהצלחה"
      });
      closeFooterTextDialog();
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
        const {
          error
        } = await api.mutate(`/digital-shifts/${shift.id}`, {
          person_name: workerId,
          additional_text: additionalText || shift.additional_text
        }, 'PUT');
        if (error) throw error;
        setShifts(shifts.map(s => s.id === shift.id ? {
          ...s,
          person_name: workerId,
          additional_text: additionalText || s.additional_text
        } : s));
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
      [key]: {
        rowId,
        dayIndex,
        content
      }
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
        const updatedContents = {
          ...row.contents,
          [dayIndex]: pendingUpdate.content
        };
        const {
          error
        } = await api.mutate(`/digital-shift-custom-rows/${rowId}`, {
          contents: updatedContents
        }, 'PUT');
        if (error) throw error;
        setPendingCustomCellUpdates(prev => {
          const updated = {
            ...prev
          };
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
    return shifts.filter(shift => shift.section_name === section && shift.day_of_week === day && shift.shift_type === shiftType);
  };
  const getCustomRowsForSection = (section: string) => {
    return customRows.filter(row => row.section_name === section);
  };
  const renderShiftCell = (section: string, day: number, shiftType: string) => {
    const cellShifts = getShiftsForCell(section, day, shiftType);
    if (cellShifts.length === 0) {
      return <TableCell className="p-2 border text-center align-top">
          <Button variant="ghost" size="sm" onClick={() => {
          setNewShiftData({
            ...newShiftData,
            section_name: section,
            day_of_week: day,
            shift_type: shiftType,
            start_time: DEFAULT_SHIFT_TIMES[shiftType].start,
            end_time: DEFAULT_SHIFT_TIMES[shiftType].end
          });
          setEditingShift(null);
          setShiftDialogOpen(true);
        }} className="w-full h-full min-h-[60px] flex items-center justify-center">
            <Plus className="h-4 w-4 opacity-50" />
          </Button>
        </TableCell>;
    }
    return <TableCell className="p-2 border align-top">
        {cellShifts.map(shift => <div key={shift.id} className={`mb-2 p-2 rounded ${shift.is_hidden ? 'opacity-50' : ''}`}>
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
                onChange={(workerId, additionalText) => updateShiftWorker(shift, workerId, additionalText)} 
                additionalText={shift.additional_text || ''} 
                placeholder="בחר עובד..." 
                className="w-full"
                department="digital" // Pass department prop
              />
            </div>
          </div>)}
      </TableCell>;
  };
  const renderCustomRows = (section: string) => {
    const rows = getCustomRowsForSection(section);
    if (rows.length === 0) {
      return <TableRow>
          <TableCell colSpan={6} className="text-center py-4">
            <Button variant="outline" onClick={() => {
            setCurrentSection(section);
            openCustomRowDialog();
          }}>
              <Plus className="mr-2 h-4 w-4" />
              הוסף שורה מותאמת אישית
            </Button>
          </TableCell>
        </TableRow>;
    }
    return rows.map(row => <TableRow key={row.id} className="custom-row-editor">
        <CustomRowColumns rowContents={row.contents} section={section} onContentChange={(dayIndex, content) => updateCustomCellContent(row.id, dayIndex, content)} onBlur={dayIndex => saveCustomCellContent(row.id, dayIndex)} onFocus={dayIndex => setCellFocused(`${row.id}-${dayIndex}`)} editable={true} showActions={true} onEdit={() => openCustomRowDialog(row)} onDelete={() => handleDeleteCustomRow(row.id)} />
      </TableRow>);
  };
  const formatDateRange = () => {
    const startDay = format(weekDate, 'dd', {
      locale: he
    });
    const endDate = new Date(weekDate);
    endDate.setDate(endDate.getDate() + 5);
    const endDay = format(endDate, 'dd', {
      locale: he
    });
    const month = format(weekDate, 'MMMM yyyy', {
      locale: he
    });
    return `${endDay}-${startDay} ב${month}`;
  };
  const closeShiftDialog = () => {
    // Ensure pointer events are always cleared
    document.body.style.pointerEvents = '';
    document.body.style.pointerEvents = 'auto';
    setShiftDialogOpen(false);
    
    // Add a timeout to ensure cleanup happens even with race conditions
    setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.pointerEvents = 'auto';
    }, 100);
  };
  const closeCustomRowDialog = () => {
    // Ensure pointer events are always cleared
    document.body.style.pointerEvents = '';
    document.body.style.pointerEvents = 'auto';
    setCustomRowDialogOpen(false);
    
    // Add a timeout to ensure cleanup happens even with race conditions
    setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.pointerEvents = 'auto';
    }, 100);
  };
  const closeFooterTextDialog = () => {
    // Ensure pointer events are always cleared
    document.body.style.pointerEvents = '';
    document.body.style.pointerEvents = 'auto';
    setFooterTextDialogOpen(false);
    
    // Add a timeout to ensure cleanup happens even with race conditions
    setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.pointerEvents = 'auto';
    }, 100);
  };
  const handlePrint = () => {
    window.print();
  };
  const handleExportPdf = async () => {
    const element = document.getElementById('digital-work-arrangement-preview');
    if (!element) return;
    element.classList.add('digital-export-pdf');
    try {
      const canvas = await html2canvas(element, {
        scrollY: -window.scrollY,
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff"
      });
      const imageData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = {
        width: canvas.width,
        height: canvas.height
      };
      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      pdf.addImage(imageData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`digital_${format(weekDate, 'dd-MM-yy')}.pdf`);
    } finally {
      element.classList.remove('digital-export-pdf');
    }
  };

  const handleExportPrintFriendlyPdf = async () => {
    // Create a temporary container for the print-friendly version
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm'; // A4 width
    tempContainer.style.height = '297mm'; // A4 height
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '5mm 2mm'; // Minimal margins: 5mm top/bottom, 2mm left/right
    tempContainer.style.fontFamily = 'Heebo, Arial, sans-serif';
    tempContainer.style.direction = 'rtl';
    tempContainer.style.textAlign = 'right';
    
    // Add CSS styles directly to the container
    const style = document.createElement('style');
    style.textContent = `
      .digital-work-arrangement-view td {
        padding: .3rem .1rem 1rem !important;
        }
      .digital-shift {
        margin: 0 !important;
        padding: 0 !important;
      }
      .digital-shift-time {
        text-decoration: underline !important;
        margin: 0 auto !important;
        padding: 0 0 5px 0 !important;
        border-bottom: 1px solid #333 !important;
        width: fit-content !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        text-align: center !important;
        display: block !important;
      }
      .digital-shift-irregular-hours {
        background-color:rgb(233, 200, 69) !important;
        color: #000 !important;
        width: fit-content !important;
        margin: 0 auto !important;
        padding: 0 0 5px 0 !important;
        text-align: center !important;
        display: block !important;
      }
      .digital-shift-person {
        position: relative;
        top: -10px;
        padding: 0 !important;
        font-size: 20px !important;
        font-weight: bold !important;
        text-align: center !important;
      }
      .digital-shift-note {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 0.875rem !important;
        text-align: center !important;
      }
      .mb-2, .mt-1, .mt-0\\.5, .flex, .items-center, .justify-center, .text-center, .font-medium {
        margin: 0 !important;
      }
    `;
    tempContainer.appendChild(style);
    
    // Create the print-friendly content
    const printContent = createPrintFriendlyContent();
    tempContainer.innerHTML += printContent;
    
    document.body.appendChild(tempContainer);
    
    try {
      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff",
        width: 210 * 3.779527559, // Convert mm to pixels (1mm = 3.779527559px)
        height: 297 * 3.779527559
      });
      
      const imageData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imageData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`digital_print_friendly_${format(weekDate, 'dd-MM-yy')}.pdf`);
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const createPrintFriendlyContent = () => {
    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const date = addDays(weekDate, i);
      weekDates.push({
        day: format(date, 'EEEE', { locale: he }),
        date: format(date, 'dd/MM'),
        fullDate: date
      });
    }

    const dateDisplay = (() => {
      const endDate = new Date(weekDate);
      endDate.setDate(endDate.getDate() + 5);
      const endDay = format(endDate, 'dd', { locale: he });
      const startDay = format(weekDate, 'dd', { locale: he });
      const month = format(weekDate, 'MMMM yyyy', { locale: he });
      return `${endDay}-${startDay} ב${month}`;
    })();

    const getWorkerFirstName = (personName: string) => {
      if (!personName) return '';
      
      // Check if personName is a UUID
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(personName)) {
        // Find worker by ID and get first name
        const worker = workers.find(w => w.id === personName);
        if (worker && worker.name) {
          return worker.name.split(' ')[0]; // Get first name only
        }
        return personName;
      }
      
      // If it's already a name, get first name
      return personName.split(' ')[0];
    };

    const getShiftsForCell = (section: string, day: number, shiftType: string) => {
      return shifts.filter(s => 
        s.section_name === section && 
        s.day_of_week === day && 
        s.shift_type === shiftType && 
        !s.is_hidden &&
        s.person_name && 
        s.person_name.trim() !== '' && 
        s.person_name !== 'null'
      );
    };

    const renderShiftCell = (section: string, day: number, shiftType: string) => {
      const cellShifts = getShiftsForCell(section, day, shiftType);
      
      if (cellShifts.length === 0) {
        return `<td class="p-2 border text-center digital-cell digital-cell-empty digital-cell-${section}"></td>`;
      }
      
      const shiftContent = cellShifts.map(shift => {
        const workerName = getWorkerFirstName(shift.person_name);
        const timeDisplay = shift.start_time && shift.end_time ? 
          `${shift.end_time.slice(0, 5)}-${shift.start_time.slice(0, 5)}` : 
          'משמרת';
        
        return `
          <div class="digital-shift digital-shift-${section}">
            <div class="digital-shift-time ${shift.is_custom_time ? 'digital-shift-custom-time digital-shift-irregular-hours' : ''}">
              ${timeDisplay}
            </div>
            <div class="digital-shift-person text-center">
              ${workerName}
            </div>
            ${shift.additional_text ? `
              <div class="digital-shift-note text-sm text-gray-600">
                ${shift.additional_text}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
      
      return `<td class="p-2 border digital-cell digital-cell-${section}">${shiftContent}</td>`;
    };

    const renderSection = (sectionName: string, sectionTitle: string) => {
      const hasShifts = shifts.some(shift => 
        shift.section_name === sectionName && 
        shift.person_name && 
        shift.person_name.trim() !== '' && 
        shift.person_name !== 'null'
      );
      
      if (!hasShifts) return '';
      
      const shiftRows = Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
        const hasShiftsForType = shifts.some(shift => 
          shift.section_name === sectionName && 
          shift.shift_type === type && 
          shift.person_name && 
          shift.person_name.trim() !== '' && 
          shift.person_name !== 'null'
        );
        
        if (!hasShiftsForType) return '';
        
        const cells = [0, 1, 2, 3, 4, 5].map(day => renderShiftCell(sectionName, day, type)).join('');
        return `<tr class="bg-white hover:bg-gray-50 transition-colors digital-shift-row digital-shift-type-row">${cells}</tr>`;
      }).join('');
      
      return `
        <tr class="digital-section-title-row">
          <td colspan="6" class="p-2 font-bold text-lg bg-gray-100 digital-section-title">
            ${sectionTitle}
          </td>
        </tr>
        ${shiftRows}
      `;
    };

    return `
      <div class="space-y-6 digital-work-arrangement-view" dir="rtl" style="font-family: 'Heebo', Arial, sans-serif; margin: 5mm 0mm !important; max-width: calc(100% - 4mm);">
        <div class="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 digital-work-header">
          <h2 class="text-2xl font-bold mb-2 md:mb-0 flex items-center digital-work-title">
            סידור עבודה דיגיטל
          </h2>
          <div class="text-lg font-medium bg-blue-50 py-1.5 rounded-full text-blue-700 flex items-center digital-work-date px-[33px]" style="padding: 0px 10px 15px;">
            ${dateDisplay}
          </div>
        </div>

        <div class="border-none shadow-md overflow-hidden digital-work-card">
          <div class="p-6">
            <div class="digital-work-arrangement-table">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="digital-header-row">
                    ${weekDates.map((date, index) => `
                      <th class="w-1/6 text-center bg-black text-white p-2 font-bold digital-header-cell">
                        <div class="date-header">
                          <div class="date-day">${date.day}</div>
                          <div class="date-number text-sm opacity-80" style="margin-bottom: 10px;">${date.date}</div>
                        </div>
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${renderSection(SECTION_NAMES.DIGITAL_SHIFTS, 'משמרות דיגיטל')}
                  ${renderSection(SECTION_NAMES.RADIO_NORTH, 'רדיו צפון')}
                  ${renderSection(SECTION_NAMES.TRANSCRIPTION_SHIFTS, 'משמרות תמלולים')}
                  ${renderSection(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, 'משמרות לייבים')}
                </tbody>
              </table>
            </div>
            
            ${arrangement?.footer_text ? `
              <div class="digital-footer-text whitespace-pre-wrap mt-8 p-4 rounded-lg">
                ${arrangement.footer_text}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  };
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">עורך סידור עבודה דיגיטל</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronRight className="h-4 w-4 ml-1" />
              שבוע קודם
            </Button>
            <div className="text-sm font-medium mx-2 bg-blue-50 py-1.5 rounded-full text-blue-700 flex items-center px-[23px]">
              <Calendar className="h-4 w-4 mr-2 px-px mx-[8px]" />
              {formatDateRange()}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              שבוע הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
          <Button variant={previewMode ? "default" : "outline"} size="sm" onClick={togglePreviewMode}>
            <Eye className="h-4 w-4 ml-1" />
            {previewMode ? "חזרה לעריכה" : "תצוגה מקדימה"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <p>טוען נתונים...</p>
        </div>
      ) : previewMode ? (
        <div className="space-y-4">
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4 ml-1" />
              ייצוא PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPrintFriendlyPdf}>
              <Printer className="h-4 w-4 ml-1" />
              ייצוא PDF נוח להדפסה
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div id="digital-work-arrangement-preview">
                <DigitalWorkArrangementView selectedDate={weekDate} weekDate={format(weekDate, 'yyyy-MM-dd')} />
              </div>
            </CardContent>
          </Card>
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
                      {[0, 1, 2, 3, 4, 5].map(day => (
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

          <Dialog open={shiftDialogOpen} onOpenChange={open => {
        if (!open) {
          // Ensure pointer events are always cleared when dialog closes
          document.body.style.pointerEvents = '';
          document.body.style.pointerEvents = 'auto';
        }
        setShiftDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px] bg-background" onEscapeKeyDown={closeShiftDialog} onPointerDownOutside={closeShiftDialog} dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'עריכת משמרת' : 'הוספת משמרת חדשה'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="shift-section">סקשן</Label>
              <Select value={newShiftData.section_name} onValueChange={value => setNewShiftData({
                ...newShiftData,
                section_name: value
              })}>
                <SelectTrigger className="col-span-3 bg-background">
                  <SelectValue placeholder="בחר סקשן" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {Object.entries(SECTION_TITLES).map(([key, title]) => <SelectItem key={key} value={key}>{title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="shift-day">יום</Label>
              <Select value={newShiftData.day_of_week.toString()} onValueChange={value => setNewShiftData({
                ...newShiftData,
                day_of_week: parseInt(value)
              })}>
                <SelectTrigger className="col-span-3 bg-background">
                  <SelectValue placeholder="בחר יום" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {DAYS_OF_WEEK.map((day, index) => <SelectItem key={index} value={index.toString()}>{day}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="shift-type">סוג משמרת</Label>
              <Select value={newShiftData.shift_type} onValueChange={value => {
                setNewShiftData({
                  ...newShiftData,
                  shift_type: value,
                  start_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES].start,
                  end_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES].end
                });
              }}>
                <SelectTrigger className="col-span-3 bg-background">
                  <SelectValue placeholder="בחר סוג משמרת" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => <SelectItem key={type} value={type}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="start-time">שעת התחלה</Label>
              <Input id="start-time" type="time" value={newShiftData.start_time} onChange={e => setNewShiftData({
                ...newShiftData,
                start_time: e.target.value
              })} className="col-span-3 bg-background" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="end-time">שעת סיום</Label>
              <Input id="end-time" type="time" value={newShiftData.end_time} onChange={e => setNewShiftData({
                ...newShiftData,
                end_time: e.target.value
              })} className="col-span-3 bg-background" />
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
                  className="w-full"
                  department="digital" // Pass department prop
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox id="is-custom-time" checked={newShiftData.is_custom_time} onCheckedChange={checked => setNewShiftData({
                ...newShiftData,
                is_custom_time: checked === true
              })} />
              <Label htmlFor="is-custom-time">הדגש שעות מותאמות אישית</Label>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox id="is-hidden" checked={newShiftData.is_hidden} onCheckedChange={checked => setNewShiftData({
                ...newShiftData,
                is_hidden: checked === true
              })} />
              <Label htmlFor="is-hidden">הסתר משמרת</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveShift}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customRowDialogOpen} onOpenChange={open => {
        if (!open) {
          // Ensure pointer events are always cleared when dialog closes
          document.body.style.pointerEvents = '';
          document.body.style.pointerEvents = 'auto';
        }
        setCustomRowDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl bg-background" onEscapeKeyDown={closeCustomRowDialog} onPointerDownOutside={closeCustomRowDialog} dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomRow ? 'עריכת שורה מותאמת אישית' : 'הוספת שורה מותאמת אישית'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-4 py-4">
            {[0, 1, 2, 3, 4, 5].map(day => <div key={day} className="flex flex-col">
                <Label className="mb-2 text-center">{DAYS_OF_WEEK[day]}</Label>
                <Textarea value={customRowContent[day] || ''} onChange={e => setCustomRowContent({
                  ...customRowContent,
                  [day]: e.target.value
                })} className="min-h-[100px] bg-background" placeholder="הזן טקסט..." />
              </div>)}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveCustomRow}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={footerTextDialogOpen} onOpenChange={open => {
        if (!open) {
          // Ensure pointer events are always cleared when dialog closes
          document.body.style.pointerEvents = '';
          document.body.style.pointerEvents = 'auto';
        }
        setFooterTextDialogOpen(open);
      }}>
        <DialogContent className="bg-background" onEscapeKeyDown={closeFooterTextDialog} onPointerDownOutside={closeFooterTextDialog} dir="rtl">
          <DialogHeader>
            <DialogTitle>טקסט תחתון</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea placeholder="הזן טקסט תחתון..." className="min-h-[200px] bg-background" value={footerText} onChange={e => setFooterText(e.target.value)} />
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
