
import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { 
  Button, 
  Input,
  Label, 
  Textarea 
} from "@/components/ui/";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PlusCircle, Trash2, Clock, ChevronLeft, ChevronRight, Save, Share2, AlertCircle, Edit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Shift {
  id: string;
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
  id: string;
  section_name: string;
  content: string | null;
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  shifts: Shift[];
  custom_rows: CustomRow[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const DAYS_OF_WEEK_WITH_DATES = ['30/03', '31/03', '01/04', '02/04', '03/04', '04/04'];

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  CUSTOM: 'custom'
};

// Default times for shifts
const DEFAULT_SHIFTS = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      startTime: '07:00',
      endTime: '12:00'
    },
    [SHIFT_TYPES.AFTERNOON]: {
      startTime: '12:00',
      endTime: '16:00'
    },
    [SHIFT_TYPES.EVENING]: {
      weekdays: {
        startTime: '16:00',
        endTime: '22:00'
      },
      thursday: {
        startTime: '16:00',
        endTime: '21:00'
      },
      friday: {
        exists: false
      }
    }
  },
  [SECTION_NAMES.RADIO_NORTH]: {
    default: {
      startTime: '09:00',
      endTime: '12:00'
    }
  },
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      weekdays: {
        startTime: '07:00',
        endTime: '14:00'
      },
      friday: {
        startTime: '08:00',
        endTime: '13:00'
      }
    },
    [SHIFT_TYPES.AFTERNOON]: {
      weekdays: {
        startTime: '14:00',
        endTime: '20:00'
      },
      friday: {
        exists: false
      }
    }
  },
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      weekdays: {
        startTime: '07:00',
        endTime: '14:00'
      },
      friday: {
        startTime: '08:00',
        endTime: '15:00'
      }
    },
    [SHIFT_TYPES.AFTERNOON]: {
      weekdays: {
        startTime: '14:00',
        endTime: '20:00'
      },
      friday: {
        exists: false
      }
    }
  }
};

// Section titles in Hebrew
const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: '',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון 12:00-09:00',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים וכו\'',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים, סושיאל ועוד'
};

const DigitalWorkArrangement = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [footerText, setFooterText] = useState('');
  const [footerImage, setFooterImage] = useState<File | null>(null);
  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(null);

  const { toast } = useToast();

  // Format date for display
  const formatDateRange = () => {
    const startDate = format(currentWeek, 'dd', { locale: he });
    const endDate = format(addDays(currentWeek, 5), 'dd', { locale: he }); // Friday
    const month = format(currentWeek, 'MMMM yyyy', { locale: he });
    return `${endDate}-${startDate} ב${month}`;
  };

  // Navigate to previous or next week
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  // Load arrangement for the selected week
  useEffect(() => {
    fetchArrangement();
  }, [currentWeek]);

  const fetchArrangement = async () => {
    setIsLoading(true);
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');

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
          ...existingArrangement,
          shifts: shifts || [],
          custom_rows: customRows || []
        });

        setFooterText(existingArrangement.footer_text || '');
        setFooterImageUrl(existingArrangement.footer_image_url);
      } else {
        // Create new arrangement with default shifts
        createNewArrangement(weekStartStr);
      }
    } catch (error) {
      console.error('Error fetching arrangement:', error);
      toast({
        title: 'שגיאה בטעינת סידור עבודה',
        description: 'אירעה שגיאה בטעינת סידור העבודה. אנא נסה שנית.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewArrangement = async (weekStartStr: string) => {
    try {
      // Create new arrangement
      const { data: newArrangement, error: insertError } = await supabase
        .from('digital_work_arrangements')
        .insert({
          week_start: weekStartStr,
          notes: null,
          footer_text: null,
          footer_image_url: null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create default shifts
      const defaultShifts = generateDefaultShifts(newArrangement.id);
      const { error: shiftsError } = await supabase
        .from('digital_shifts')
        .insert(defaultShifts);

      if (shiftsError) throw shiftsError;

      // Create default custom rows
      const defaultCustomRows = [
        {
          arrangement_id: newArrangement.id,
          section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
          content: 'עזרה מדברת',
          position: 2 // After the shifts
        }
      ];

      const { error: customRowsError } = await supabase
        .from('digital_shift_custom_rows')
        .insert(defaultCustomRows);

      if (customRowsError) throw customRowsError;

      // Fetch complete data
      await fetchArrangement();
    } catch (error) {
      console.error('Error creating new arrangement:', error);
      toast({
        title: 'שגיאה ביצירת סידור עבודה חדש',
        description: 'אירעה שגיאה ביצירת סידור העבודה. אנא נסה שנית.',
        variant: 'destructive'
      });
    }
  };

  const generateDefaultShifts = (arrangementId: string): any[] => {
    const shifts: any[] = [];
    let positionCounter = 0;

    // Digital shifts section
    for (let day = 0; day < 6; day++) {
      // Morning shift
      shifts.push({
        arrangement_id: arrangementId,
        section_name: SECTION_NAMES.DIGITAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: day === 5 ? '08:00' : DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.MORNING].startTime, // Friday starts later
        end_time: DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.MORNING].endTime,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });

      // Afternoon shift
      shifts.push({
        arrangement_id: arrangementId,
        section_name: SECTION_NAMES.DIGITAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.AFTERNOON,
        start_time: DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.AFTERNOON].startTime,
        end_time: day === 5 ? '15:00' : DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.AFTERNOON].endTime, // Friday ends earlier
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });

      // Evening shift (not on Friday)
      if (day < 5) {
        shifts.push({
          arrangement_id: arrangementId,
          section_name: SECTION_NAMES.DIGITAL_SHIFTS,
          day_of_week: day,
          shift_type: SHIFT_TYPES.EVENING,
          start_time: DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.EVENING].weekdays.startTime,
          end_time: day === 4 ? DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.EVENING].thursday.endTime : DEFAULT_SHIFTS[SECTION_NAMES.DIGITAL_SHIFTS][SHIFT_TYPES.EVENING].weekdays.endTime, // Thursday ends earlier
          person_name: null,
          is_custom_time: false,
          is_hidden: false,
          position: positionCounter++
        });
      }
    }

    // Radio North section (Sunday to Thursday)
    for (let day = 0; day < 5; day++) {
      shifts.push({
        arrangement_id: arrangementId,
        section_name: SECTION_NAMES.RADIO_NORTH,
        day_of_week: day,
        shift_type: SHIFT_TYPES.CUSTOM,
        start_time: DEFAULT_SHIFTS[SECTION_NAMES.RADIO_NORTH].default.startTime,
        end_time: DEFAULT_SHIFTS[SECTION_NAMES.RADIO_NORTH].default.endTime,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });
    }

    // Transcription shifts section
    for (let day = 0; day < 6; day++) {
      // Morning shift
      shifts.push({
        arrangement_id: arrangementId,
        section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: day === 5 ? DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.MORNING].friday.startTime : DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.MORNING].weekdays.startTime,
        end_time: day === 5 ? DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.MORNING].friday.endTime : DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.MORNING].weekdays.endTime,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });

      // Afternoon shift (not on Friday)
      if (day < 5) {
        shifts.push({
          arrangement_id: arrangementId,
          section_name: SECTION_NAMES.TRANSCRIPTION_SHIFTS,
          day_of_week: day,
          shift_type: SHIFT_TYPES.AFTERNOON,
          start_time: DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.AFTERNOON].weekdays.startTime,
          end_time: DEFAULT_SHIFTS[SECTION_NAMES.TRANSCRIPTION_SHIFTS][SHIFT_TYPES.AFTERNOON].weekdays.endTime,
          person_name: null,
          is_custom_time: false,
          is_hidden: false,
          position: positionCounter++
        });
      }
    }

    // Live and Social shifts section
    for (let day = 0; day < 6; day++) {
      // Morning shift
      shifts.push({
        arrangement_id: arrangementId,
        section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
        day_of_week: day,
        shift_type: SHIFT_TYPES.MORNING,
        start_time: day === 5 ? DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.MORNING].friday.startTime : DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.MORNING].weekdays.startTime,
        end_time: day === 5 ? DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.MORNING].friday.endTime : DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.MORNING].weekdays.endTime,
        person_name: null,
        is_custom_time: false,
        is_hidden: false,
        position: positionCounter++
      });

      // Afternoon shift (not on Friday)
      if (day < 5) {
        shifts.push({
          arrangement_id: arrangementId,
          section_name: SECTION_NAMES.LIVE_SOCIAL_SHIFTS,
          day_of_week: day,
          shift_type: SHIFT_TYPES.AFTERNOON,
          start_time: DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.AFTERNOON].weekdays.startTime,
          end_time: DEFAULT_SHIFTS[SECTION_NAMES.LIVE_SOCIAL_SHIFTS][SHIFT_TYPES.AFTERNOON].weekdays.endTime,
          person_name: null,
          is_custom_time: false,
          is_hidden: false,
          position: positionCounter++
        });
      }
    }

    return shifts;
  };

  const handleShiftChange = (
    shiftId: string, 
    field: 'person_name' | 'start_time' | 'end_time' | 'is_custom_time' | 'is_hidden', 
    value: any
  ) => {
    if (!arrangement) return;

    // Update the shift in the local state
    const updatedShifts = arrangement.shifts.map(shift => {
      if (shift.id === shiftId) {
        if (field === 'start_time' || field === 'end_time') {
          // If changing time, also mark as custom
          return { ...shift, [field]: value, is_custom_time: true };
        }
        return { ...shift, [field]: value };
      }
      return shift;
    });

    setArrangement({ ...arrangement, shifts: updatedShifts });
  };

  const handleCustomRowChange = (rowId: string, content: string) => {
    if (!arrangement) return;

    // Update the custom row in the local state
    const updatedRows = arrangement.custom_rows.map(row => {
      if (row.id === rowId) {
        return { ...row, content };
      }
      return row;
    });

    setArrangement({ ...arrangement, custom_rows: updatedRows });
  };

  const addCustomRow = async (sectionName: string) => {
    if (!arrangement) return;

    try {
      // Find the highest position in this section
      const sectionRows = arrangement.custom_rows.filter(row => row.section_name === sectionName);
      const maxPosition = sectionRows.length > 0 
        ? Math.max(...sectionRows.map(row => row.position)) 
        : 0;

      const newRow = {
        arrangement_id: arrangement.id,
        section_name: sectionName,
        content: '',
        position: maxPosition + 1
      };

      const { data, error } = await supabase
        .from('digital_shift_custom_rows')
        .insert(newRow)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setArrangement({
        ...arrangement,
        custom_rows: [...arrangement.custom_rows, data]
      });
    } catch (error) {
      console.error('Error adding custom row:', error);
      toast({
        title: 'שגיאה בהוספת שורה',
        description: 'אירעה שגיאה בהוספת שורה חדשה. אנא נסה שנית.',
        variant: 'destructive'
      });
    }
  };

  const addShift = async (sectionName: string, dayOfWeek: number) => {
    if (!arrangement) return;

    try {
      // Find the highest position for this section and day
      const sectionDayShifts = arrangement.shifts.filter(shift => 
        shift.section_name === sectionName && shift.day_of_week === dayOfWeek
      );
      
      const maxPosition = sectionDayShifts.length > 0 
        ? Math.max(...sectionDayShifts.map(shift => shift.position)) 
        : 0;

      const newShift = {
        arrangement_id: arrangement.id,
        section_name: sectionName,
        day_of_week: dayOfWeek,
        shift_type: SHIFT_TYPES.CUSTOM,
        start_time: '09:00',
        end_time: '17:00',
        person_name: null,
        is_custom_time: true,
        is_hidden: false,
        position: maxPosition + 1
      };

      const { data, error } = await supabase
        .from('digital_shifts')
        .insert(newShift)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setArrangement({
        ...arrangement,
        shifts: [...arrangement.shifts, data]
      });
    } catch (error) {
      console.error('Error adding shift:', error);
      toast({
        title: 'שגיאה בהוספת משמרת',
        description: 'אירעה שגיאה בהוספת משמרת חדשה. אנא נסה שנית.',
        variant: 'destructive'
      });
    }
  };

  const deleteShift = async (shiftId: string) => {
    if (!arrangement) return;

    try {
      const { error } = await supabase
        .from('digital_shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;

      // Update local state
      setArrangement({
        ...arrangement,
        shifts: arrangement.shifts.filter(shift => shift.id !== shiftId)
      });

      toast({
        title: 'המשמרת הוסרה בהצלחה',
      });
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: 'שגיאה בהסרת המשמרת',
        description: 'אירעה שגיאה בהסרת המשמרת. אנא נסה שנית.',
        variant: 'destructive'
      });
    }
  };

  const deleteCustomRow = async (rowId: string) => {
    if (!arrangement) return;

    try {
      const { error } = await supabase
        .from('digital_shift_custom_rows')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      // Update local state
      setArrangement({
        ...arrangement,
        custom_rows: arrangement.custom_rows.filter(row => row.id !== rowId)
      });

      toast({
        title: 'השורה הוסרה בהצלחה',
      });
    } catch (error) {
      console.error('Error deleting custom row:', error);
      toast({
        title: 'שגיאה בהסרת השורה',
        description: 'אירעה שגיאה בהסרת השורה. אנא נסה שנית.',
        variant: 'destructive'
      });
    }
  };

  const toggleShiftVisibility = async (shiftId: string) => {
    if (!arrangement) return;

    const shift = arrangement.shifts.find(s => s.id === shiftId);
    if (!shift) return;

    try {
      await handleShiftChange(shiftId, 'is_hidden', !shift.is_hidden);
    } catch (error) {
      console.error('Error toggling shift visibility:', error);
      toast({
        title: 'שגיאה בעדכון המשמרת',
        description: 'אירעה שגיאה בעדכון המשמרת. אנא נסה שנית.',
        variant: 'destructive'
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setFooterImage(files[0]);
    }
  };

  const uploadFooterImage = async () => {
    if (!arrangement || !footerImage) return null;
    
    try {
      const fileExt = footerImage.name.split('.').pop();
      const fileName = `digital_arrangement_${arrangement.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('arrangements')
        .upload(fileName, footerImage);
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('arrangements')
        .getPublicUrl(fileName);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const saveArrangement = async () => {
    if (!arrangement) return;
    
    setIsSaving(true);
    
    try {
      // Upload footer image if exists
      let imageUrl = footerImageUrl;
      if (footerImage) {
        imageUrl = await uploadFooterImage();
      }
      
      // Update arrangement details
      const { error: updateError } = await supabase
        .from('digital_work_arrangements')
        .update({
          footer_text: footerText,
          footer_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', arrangement.id);
      
      if (updateError) throw updateError;
      
      // Update all shifts
      for (const shift of arrangement.shifts) {
        const { error: shiftError } = await supabase
          .from('digital_shifts')
          .update({
            person_name: shift.person_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            is_custom_time: shift.is_custom_time,
            is_hidden: shift.is_hidden
          })
          .eq('id', shift.id);
        
        if (shiftError) throw shiftError;
      }
      
      // Update all custom rows
      for (const row of arrangement.custom_rows) {
        const { error: rowError } = await supabase
          .from('digital_shift_custom_rows')
          .update({
            content: row.content
          })
          .eq('id', row.id);
        
        if (rowError) throw rowError;
      }
      
      toast({
        title: 'סידור העבודה נשמר בהצלחה',
      });
      
      // Refresh data
      await fetchArrangement();
    } catch (error) {
      console.error('Error saving arrangement:', error);
      toast({
        title: 'שגיאה בשמירת סידור העבודה',
        description: 'אירעה שגיאה בשמירת סידור העבודה. אנא נסה שנית.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderShiftCell = (section: string, day: number, shiftType: string) => {
    if (!arrangement) return null;
    
    // Find all shifts for this section, day and type
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === section && 
      shift.day_of_week === day && 
      shift.shift_type === shiftType
    );
    
    // If no shifts, show add button
    if (shifts.length === 0) {
      return (
        <TableCell key={`${section}-${day}-${shiftType}`} className="p-1 text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8"
            onClick={() => addShift(section, day)}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </TableCell>
      );
    }
    
    // Render all shifts for this cell
    return (
      <TableCell key={`${section}-${day}-${shiftType}`} className="p-1">
        {shifts.map((shift, index) => (
          <div 
            key={shift.id} 
            className={`mb-1 p-1 rounded ${shift.is_hidden ? 'opacity-50' : ''}`}
          >
            {!shift.is_hidden ? (
              <>
                <div className="flex items-center justify-center mb-1">
                  <div 
                    className={`flex border rounded px-1 ${shift.is_custom_time ? 'bg-yellow-100 font-bold' : ''}`}
                  >
                    <input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) => handleShiftChange(shift.id, 'end_time', e.target.value)}
                      className="bg-transparent border-none w-20 text-right"
                    />
                    <span className="mx-1">-</span>
                    <input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) => handleShiftChange(shift.id, 'start_time', e.target.value)}
                      className="bg-transparent border-none w-20"
                    />
                  </div>
                </div>
                <div className="w-full">
                  <input
                    type="text"
                    value={shift.person_name || ''}
                    onChange={(e) => handleShiftChange(shift.id, 'person_name', e.target.value)}
                    placeholder="שם העובד"
                    className="w-full border-b text-center bg-transparent"
                  />
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">משמרת חסויה</div>
            )}
            <div className="flex justify-center mt-1 space-x-1 rtl:space-x-reverse">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={() => toggleShiftVisibility(shift.id)}
              >
                {shift.is_hidden ? <Edit className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-red-500"
                onClick={() => deleteShift(shift.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 mt-1"
          onClick={() => addShift(section, day)}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </TableCell>
    );
  };

  const renderRadioNorthCell = (day: number) => {
    if (!arrangement) return null;
    
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === SECTION_NAMES.RADIO_NORTH && 
      shift.day_of_week === day
    );
    
    if (shifts.length === 0) {
      return (
        <TableCell key={`radio-north-${day}`} className="p-1 text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8"
            onClick={() => addShift(SECTION_NAMES.RADIO_NORTH, day)}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </TableCell>
      );
    }
    
    return (
      <TableCell key={`radio-north-${day}`} className="p-1">
        {shifts.map((shift) => (
          <div key={shift.id} className={`mb-1 p-1 rounded ${shift.is_hidden ? 'opacity-50' : ''}`}>
            {!shift.is_hidden ? (
              <>
                <div className="flex items-center justify-center mb-1">
                  <div className={`flex border rounded px-1 ${shift.is_custom_time ? 'bg-yellow-100 font-bold' : ''}`}>
                    <input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) => handleShiftChange(shift.id, 'end_time', e.target.value)}
                      className="bg-transparent border-none w-20 text-right"
                    />
                    <span className="mx-1">-</span>
                    <input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) => handleShiftChange(shift.id, 'start_time', e.target.value)}
                      className="bg-transparent border-none w-20"
                    />
                  </div>
                </div>
                <div className="w-full">
                  <input
                    type="text"
                    value={shift.person_name || ''}
                    onChange={(e) => handleShiftChange(shift.id, 'person_name', e.target.value)}
                    placeholder="שם העובד"
                    className="w-full border-b text-center bg-transparent"
                  />
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">משמרת חסויה</div>
            )}
            <div className="flex justify-center mt-1 space-x-1 rtl:space-x-reverse">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={() => toggleShiftVisibility(shift.id)}
              >
                {shift.is_hidden ? <Edit className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-red-500"
                onClick={() => deleteShift(shift.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  const renderCustomRows = (sectionName: string) => {
    if (!arrangement) return null;
    
    const rows = arrangement.custom_rows.filter(row => row.section_name === sectionName);
    
    return (
      <>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell colSpan={6} className="p-2">
              <div className="flex">
                <input
                  type="text"
                  value={row.content || ''}
                  onChange={(e) => handleCustomRowChange(row.id, e.target.value)}
                  placeholder="תוכן השורה"
                  className="flex-1 border-b text-center bg-transparent"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 text-red-500"
                  onClick={() => deleteCustomRow(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={6} className="p-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => addCustomRow(sectionName)}
              className="w-full"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              הוסף שורת טקסט
            </Button>
          </TableCell>
        </TableRow>
      </>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>לוח משמרות דיגיטל</CardTitle>
          <CardDescription>טוען...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="digital-work-arrangement">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle>לוח משמרות דיגיטל</CardTitle>
            <CardDescription>{formatDateRange()}</CardDescription>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse mt-4 sm:mt-0">
            <Button variant="outline" onClick={() => navigateWeek('prev')}>
              <ChevronRight className="h-4 w-4 ml-1" />
              שבוע קודם
            </Button>
            <Button variant="outline" onClick={() => navigateWeek('next')}>
              שבוע הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {arrangement && (
          <div className="space-y-6">
            {/* Digital Shifts Table */}
            <div className="bg-white rounded-md overflow-x-auto">
              <Table className="border">
                <TableHeader>
                  <TableRow className="bg-black text-white">
                    {DAYS_OF_WEEK.map((day, index) => (
                      <TableHead key={day} className="text-center text-white border">
                        <div>{day}</div>
                        <div className="text-sm">{DAYS_OF_WEEK_WITH_DATES[index]}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Morning shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.MORNING))}
                  </TableRow>
                  {/* Afternoon shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON))}
                  </TableRow>
                  {/* Evening shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      // Only render evening shift for Sunday-Thursday (0-4)
                      if (day === 5) { // Friday
                        return <TableCell key={`evening-${day}`} className="border"></TableCell>;
                      }
                      return renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.EVENING);
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
                    {[...Array(5)].map((_, day) => renderRadioNorthCell(day))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Transcription Shifts Table */}
            <div className="overflow-x-auto">
              <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
              <Table className="border">
                <TableBody>
                  {/* Morning shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.MORNING))}
                  </TableRow>
                  {/* Afternoon shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      // Only render afternoon shift for Sunday-Thursday (0-4)
                      if (day === 5) { // Friday
                        return <TableCell key={`transcription-afternoon-${day}`} className="border"></TableCell>;
                      }
                      return renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.AFTERNOON);
                    })}
                  </TableRow>
                  {/* Custom rows */}
                  {renderCustomRows(SECTION_NAMES.TRANSCRIPTION_SHIFTS)}
                </TableBody>
              </Table>
            </div>

            {/* Live and Social Shifts Table */}
            <div className="overflow-x-auto">
              <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
              <Table className="border">
                <TableBody>
                  {/* Morning shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.MORNING))}
                  </TableRow>
                  {/* Afternoon shift row */}
                  <TableRow>
                    {[...Array(6)].map((_, day) => {
                      // Only render afternoon shift for Sunday-Thursday (0-4)
                      if (day === 5) { // Friday
                        return <TableCell key={`live-social-afternoon-${day}`} className="border"></TableCell>;
                      }
                      return renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON);
                    })}
                  </TableRow>
                  {/* Custom rows */}
                  {renderCustomRows(SECTION_NAMES.LIVE_SOCIAL_SHIFTS)}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="bg-white rounded-md p-4 border">
              <div className="font-bold mb-2">הערות והגדרות</div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="footer-text">טקסט תחתית</Label>
                  <Textarea
                    id="footer-text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="הוסף הערות או הנחיות נוספות"
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label htmlFor="footer-image">תמונה לתחתית</Label>
                  <Input
                    id="footer-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {footerImageUrl && (
                    <div className="mt-2">
                      <img 
                        src={footerImageUrl} 
                        alt="Footer" 
                        className="max-h-[200px] border rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-2 rtl:space-x-reverse">
              <Button 
                onClick={saveArrangement} 
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'שומר...' : 'שמור סידור עבודה'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DigitalWorkArrangement;
