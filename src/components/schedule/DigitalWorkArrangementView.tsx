
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { format, isSameWeek, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DigitalWorkArrangement } from '@/types/schedule';
import { supabase } from "@/lib/supabase";
import EditModeDialog from './EditModeDialog';
import '@/styles/digital-work-arrangement.css';

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
            <div className={`digital-shift-time ${shift.is_custom_time ? 'digital-shift-custom-time' : ''}`}>
              {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
            </div>
            <div className="digital-shift-person">
              {shift.person_name || ''}
              {shift.additional_text && (
                <div className="digital-shift-note">
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">סידור עבודה דיגיטל</h2>
        <div className="text-lg font-medium">{dateDisplay}</div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <p>טוען נתונים...</p>
        </div>
      ) : !arrangement ? (
        <div className="flex justify-center my-8">
          <p>אין סידור עבודה לשבוע זה</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {Object.entries(SECTION_TITLES).map(([key, title]) => (
              <button
                key={`section-${key}`}
                onClick={() => setCurrentSection(key)}
                className={`px-4 py-2 rounded-md mb-2 ${
                  currentSection === key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {title}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24 text-center bg-black text-white">משמרת</TableHead>
                      {DAYS_OF_WEEK.map((day, index) => (
                        <TableHead key={`day-${index}`} className="text-center bg-black text-white">
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
                        <TableRow key={`row-${type}`}>
                          <TableCell className="font-medium text-center">{label}</TableCell>
                          {[0, 1, 2, 3, 4, 5].map((day) => 
                            renderShiftCell(currentSection, day, type)
                          )}
                        </TableRow>
                      );
                    })}
                    
                    {getCustomRowsForSection(currentSection).map((row) => (
                      <TableRow key={`custom-row-${row.id}`}>
                        <TableCell className="font-medium text-center">
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
              <CardFooter className="flex flex-col items-start p-6 border-t">
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
        onClose={() => setEditModeOpen(false)}
        onEditCurrent={() => {
          console.log('Edit current arrangement');
          setEditModeOpen(false);
        }}
        onEditAll={() => {
          console.log('Edit all future arrangements');
          setEditModeOpen(false);
        }}
      />
    </div>
  );
};

export default DigitalWorkArrangementView;
