
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DigitalWorkArrangement } from '@/types/schedule';
import { supabase } from "@/lib/supabase";
import EditModeDialog from './EditModeDialog';
import '@/styles/digital-work-arrangement.css';
import { Calendar, Clock } from 'lucide-react';

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

interface DigitalWorkArrangementViewProps {
  weekDate?: string;
  isEditable?: boolean;
}

const DigitalWorkArrangementView: React.FC<DigitalWorkArrangementViewProps> = ({ 
  weekDate,
  isEditable = false
}) => {
  const [arrangement, setArrangement] = useState<DigitalWorkArrangement | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [customRows, setCustomRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(SECTION_NAMES.DIGITAL_SHIFTS);
  const [editModeOpen, setEditModeOpen] = useState(false);
  
  const { toast } = useToast();

  const selectedWeekDate = useMemo(() => {
    if (weekDate) {
      try {
        return parseISO(weekDate);
      } catch (error) {
        console.error("Error parsing date:", error);
      }
    }
    return new Date();
  }, [weekDate]);
  
  useEffect(() => {
    fetchArrangement();
    
    // Ensure pointer-events style is reset when component unmounts
    return () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, [selectedWeekDate]);

  const dateDisplay = useMemo(() => {
    const startDay = format(selectedWeekDate, 'dd', { locale: he });
    const endDate = new Date(selectedWeekDate);
    endDate.setDate(endDate.getDate() + 5); // Friday
    const endDay = format(endDate, 'dd', { locale: he });
    const month = format(selectedWeekDate, 'MMMM yyyy', { locale: he });
    return `${endDay}-${startDay} ב${month}`;
  }, [selectedWeekDate]);

  const fetchArrangement = async () => {
    setLoading(true);
    const weekStartStr = format(selectedWeekDate, 'yyyy-MM-dd');
    
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
        
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', firstArrangement.id)
          .not('is_hidden', 'eq', true)
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
                contents = JSON.parse(row.contents);
              } else if (typeof row.contents === 'object') {
                Object.entries(row.contents).forEach(([key, value]) => {
                  if (value !== null && value !== undefined) {
                    contents[Number(key)] = String(value);
                  }
                });
              }
            }
          } catch (e) {
            console.error('Error parsing contents', e);
          }
          
          return {
            ...row,
            contents: contents
          };
        }) || [];
        
        setCustomRows(processedCustomRows);
      } else {
        setArrangement(null);
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
      return <TableCell key={`empty-${section}-${day}-${shiftType}`} className="p-2 border text-center"></TableCell>;
    }
    
    return (
      <TableCell key={`cell-${section}-${day}-${shiftType}`} className="p-2 border">
        {cellShifts.map((shift) => (
          <div key={`shift-${shift.id}`} className="mb-2">
            <div className={`digital-shift-time ${shift.is_custom_time ? 'digital-shift-custom-time' : ''} flex items-center justify-center`}>
              <Clock className="h-3 w-3 mr-1 opacity-70" />
              {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
            </div>
            <div className="digital-shift-person mt-1 text-center">
              {shift.person_name || ''}
              {shift.additional_text && (
                <div className="digital-shift-note text-sm mt-0.5 text-gray-600">
                  {shift.additional_text}
                </div>
              )}
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  return (
    <div className="space-y-6 digital-work-arrangement-view" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-2xl font-bold mb-2 md:mb-0 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          סידור עבודה דיגיטל
        </h2>
        <div className="text-lg font-medium bg-blue-50 px-4 py-1.5 rounded-full text-blue-700 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {dateDisplay}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8 p-8 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
            <p className="text-lg">טוען נתונים...</p>
          </div>
        </div>
      ) : !arrangement ? (
        <div className="flex justify-center my-8 p-8 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col items-center">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
            <p className="text-lg">אין סידור עבודה לשבוע זה</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start bg-white p-4 rounded-lg shadow-sm">
            {Object.entries(SECTION_TITLES).map(([key, title]) => (
              <button
                key={`section-${key}`}
                onClick={() => setCurrentSection(key)}
                className={`px-4 py-2 rounded-md mb-2 transition-all duration-200 ${
                  currentSection === key 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {title}
              </button>
            ))}
          </div>

          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24 text-center bg-black text-white p-3 font-bold">משמרת</TableHead>
                      {DAYS_OF_WEEK.map((day, index) => (
                        <TableHead key={`day-${index}`} className="text-center bg-black text-white p-3 font-bold">
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
                      const hasShifts = shifts.some(shift => 
                        shift.section_name === currentSection && 
                        shift.shift_type === type
                      );
                      
                      if (!hasShifts) return null;
                      
                      return (
                        <TableRow key={`row-${type}`} className="bg-white hover:bg-gray-50 transition-colors">
                          <TableCell className="font-medium text-center p-3 bg-gray-100">{label}</TableCell>
                          {[0, 1, 2, 3, 4, 5].map((day) => 
                            renderShiftCell(currentSection, day, type)
                          )}
                        </TableRow>
                      );
                    })}
                    
                    {getCustomRowsForSection(currentSection).map((row) => (
                      <TableRow key={`custom-row-${row.id}`} className="bg-white hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-center p-3 bg-gray-100">
                          {row.contents[0] || ''}
                        </TableCell>
                        <TableCell className="p-2 border text-center">
                          {row.contents[1] || ''}
                        </TableCell>
                        <TableCell className="p-2 border text-center">
                          {row.contents[2] || ''}
                        </TableCell>
                        <TableCell className="p-2 border text-center">
                          {row.contents[3] || ''}
                        </TableCell>
                        <TableCell className="p-2 border text-center">
                          {row.contents[4] || ''}
                        </TableCell>
                        <TableCell className="p-2 border text-center">
                          {row.contents[5] || ''}
                        </TableCell>
                        <TableCell className="p-2 border text-center">
                          {row.contents[6] || ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            
            {arrangement.footer_text && (
              <CardFooter className="flex flex-col items-start p-6 border-t bg-gray-50">
                <div className="digital-footer-text whitespace-pre-wrap">
                  {arrangement.footer_text}
                </div>
              </CardFooter>
            )}
          </Card>
        </>
      )}
      
      <EditModeDialog 
        isOpen={editModeOpen} 
        onClose={() => {
          setEditModeOpen(false);
          // Ensure pointer-events is reset
          if (document.body.style.pointerEvents === 'none') {
            document.body.style.pointerEvents = '';
          }
        }}
        onEditCurrent={() => {
          console.log('Edit current arrangement');
          setEditModeOpen(false);
          // Ensure pointer-events is reset
          if (document.body.style.pointerEvents === 'none') {
            document.body.style.pointerEvents = '';
          }
        }}
        onEditAll={() => {
          console.log('Edit all future arrangements');
          setEditModeOpen(false);
          // Ensure pointer-events is reset
          if (document.body.style.pointerEvents === 'none') {
            document.body.style.pointerEvents = '';
          }
        }}
      />
    </div>
  );
};

export default DigitalWorkArrangementView;
