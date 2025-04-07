import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DigitalWorkArrangement } from '@/types/schedule';
import { supabase } from "@/lib/supabase";
import EditModeDialog from './EditModeDialog';
import '@/styles/digital-work-arrangement.css';
import { Calendar, Clock } from 'lucide-react';
import { CustomRowColumns } from './workers/CustomRowColumns';
import { Worker } from '@/lib/supabase/workers';
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
const SHIFT_TYPE_LABELS = {
  [SHIFT_TYPES.MORNING]: 'בוקר',
  [SHIFT_TYPES.AFTERNOON]: 'צהריים',
  [SHIFT_TYPES.EVENING]: 'ערב',
  [SHIFT_TYPES.CUSTOM]: 'מותאם אישית'
};
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
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModeOpen, setEditModeOpen] = useState(false);
  const {
    toast
  } = useToast();
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
    fetchWorkers();

    // Ensure pointer-events style is reset when component unmounts
    return () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, [selectedWeekDate]);

  // Generate formatted dates for the week
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const date = addDays(selectedWeekDate, i);
      dates.push({
        day: format(date, 'EEEE', {
          locale: he
        }),
        date: format(date, 'dd/MM'),
        fullDate: date
      });
    }
    return dates;
  }, [selectedWeekDate]);
  const dateDisplay = useMemo(() => {
    const startDay = format(selectedWeekDate, 'dd', {
      locale: he
    });
    const endDate = new Date(selectedWeekDate);
    endDate.setDate(endDate.getDate() + 5); // Friday
    const endDay = format(endDate, 'dd', {
      locale: he
    });
    const month = format(selectedWeekDate, 'MMMM yyyy', {
      locale: he
    });
    return `${endDay}-${startDay} ב${month}`;
  }, [selectedWeekDate]);
  const fetchWorkers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('workers').select('*').order('name');
      if (error) {
        throw error;
      }
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };
  const fetchArrangement = async () => {
    setLoading(true);
    const weekStartStr = format(selectedWeekDate, 'yyyy-MM-dd');
    try {
      const {
        data: arrangementData,
        error: arrangementError
      } = await supabase.from('digital_work_arrangements').select('*').eq('week_start', weekStartStr);
      if (arrangementError) {
        throw arrangementError;
      }
      if (arrangementData && arrangementData.length > 0) {
        const firstArrangement = arrangementData[0];
        setArrangement(firstArrangement);
        const {
          data: shiftsData,
          error: shiftsError
        } = await supabase.from('digital_shifts').select('*').eq('arrangement_id', firstArrangement.id).not('is_hidden', 'eq', true).order('position', {
          ascending: true
        });
        if (shiftsError) {
          throw shiftsError;
        }
        setShifts(shiftsData || []);
        const {
          data: customRowsData,
          error: customRowsError
        } = await supabase.from('digital_shift_custom_rows').select('*').eq('arrangement_id', firstArrangement.id).order('position', {
          ascending: true
        });
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
  const getWorkerName = (personName: string) => {
    if (!personName) return '';

    // Check if personName is a UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(personName)) {
      const worker = workers.find(w => w.id === personName);
      return worker ? worker.name : personName;
    }
    return personName;
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
      return <TableCell key={`empty-${section}-${day}-${shiftType}`} className={`p-2 border text-center digital-cell digital-cell-empty digital-cell-${section}`}></TableCell>;
    }
    return <TableCell key={`cell-${section}-${day}-${shiftType}`} className={`p-2 border digital-cell digital-cell-${section}`}>
        {cellShifts.map(shift => <div key={`shift-${shift.id}`} className={`mb-2 digital-shift digital-shift-${section}`}>
            <div className={`digital-shift-time ${shift.is_custom_time ? 'digital-shift-custom-time' : ''} flex items-center justify-center`}>
              <Clock className="h-3 w-3 mr-1 opacity-70 px-px py-0 mx-[4px]" />
              {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
            </div>
            <div className="digital-shift-person mt-1 text-center">
              {getWorkerName(shift.person_name) || ''}
              {shift.additional_text && <div className="digital-shift-note text-sm mt-0.5 text-gray-600">
                  {shift.additional_text}
                </div>}
            </div>
          </div>)}
      </TableCell>;
  };

  // Render all section tables together in a single table
  const renderWorkArrangementTable = () => {
    const hasAnyContent = shifts.length > 0 || customRows.length > 0;
    if (!hasAnyContent) return null;
    return <div className="digital-work-arrangement-table">
        <Table className="w-full border-collapse">
          <TableHeader>
            <TableRow className="digital-header-row">
              {weekDates.map((date, index) => <TableHead key={`day-header-${index}`} className="w-1/6 text-center bg-black text-white p-2 font-bold digital-header-cell">
                  <div className="date-header">
                    <div className="date-day">{date.day}</div>
                    <div className="date-number text-sm opacity-80">{date.date}</div>
                  </div>
                </TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Digital Shifts Section */}
            {shifts.some(shift => shift.section_name === SECTION_NAMES.DIGITAL_SHIFTS) && <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">
                    משמרות דיגיטל
                  </TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
              const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.DIGITAL_SHIFTS && shift.shift_type === type);
              if (!hasShifts) return null;
              return <TableRow key={`row-${type}`} className="bg-white hover:bg-gray-50 transition-colors digital-shift-row digital-shift-type-row">
                      {[0, 1, 2, 3, 4, 5].map(day => renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, type))}
                    </TableRow>;
            })}
                {getCustomRowsForSection(SECTION_NAMES.DIGITAL_SHIFTS).map(row => <TableRow key={`custom-row-${row.id}`} className="bg-white hover:bg-gray-50 transition-colors digital-custom-row">
                    <CustomRowColumns rowContents={row.contents} section={SECTION_NAMES.DIGITAL_SHIFTS} />
                  </TableRow>)}
              </>}

            {/* Radio North Section */}
            {shifts.some(shift => shift.section_name === SECTION_NAMES.RADIO_NORTH) && <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">
                    רדיו צפון
                  </TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
              const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.RADIO_NORTH && shift.shift_type === type);
              if (!hasShifts) return null;
              return <TableRow key={`row-radio-${type}`} className="bg-white hover:bg-gray-50 transition-colors digital-shift-row digital-radio-shift-row">
                      {[0, 1, 2, 3, 4, 5].map(day => renderShiftCell(SECTION_NAMES.RADIO_NORTH, day, type))}
                    </TableRow>;
            })}
                {getCustomRowsForSection(SECTION_NAMES.RADIO_NORTH).map(row => <TableRow key={`custom-row-radio-${row.id}`} className="bg-white hover:bg-gray-50 transition-colors digital-custom-row">
                    <CustomRowColumns rowContents={row.contents} section={SECTION_NAMES.RADIO_NORTH} />
                  </TableRow>)}
              </>}

            {/* Transcription Shifts Section */}
            {shifts.some(shift => shift.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS) && <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">משמרות תמלולים וכו'</TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
              const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && shift.shift_type === type);
              if (!hasShifts) return null;
              return <TableRow key={`row-trans-${type}`} className="bg-white hover:bg-gray-50 transition-colors digital-shift-row digital-transcription-shift-row">
                      {[0, 1, 2, 3, 4, 5].map(day => renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, type))}
                    </TableRow>;
            })}
                {getCustomRowsForSection(SECTION_NAMES.TRANSCRIPTION_SHIFTS).map(row => <TableRow key={`custom-row-trans-${row.id}`} className="bg-white hover:bg-gray-50 transition-colors digital-custom-row">
                    <CustomRowColumns rowContents={row.contents} section={SECTION_NAMES.TRANSCRIPTION_SHIFTS} />
                  </TableRow>)}
              </>}

            {/* Live Social Shifts Section */}
            {shifts.some(shift => shift.section_name === SECTION_NAMES.LIVE_SOCIAL_SHIFTS) && <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">משמרות לייבים, סושיאל ועוד</TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
              const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.LIVE_SOCIAL_SHIFTS && shift.shift_type === type);
              if (!hasShifts) return null;
              return <TableRow key={`row-live-${type}`} className="bg-white hover:bg-gray-50 transition-colors digital-shift-row digital-live-shift-row">
                      {[0, 1, 2, 3, 4, 5].map(day => renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, type))}
                    </TableRow>;
            })}
                {getCustomRowsForSection(SECTION_NAMES.LIVE_SOCIAL_SHIFTS).map(row => <TableRow key={`custom-row-live-${row.id}`} className="bg-white hover:bg-gray-50 transition-colors digital-custom-row">
                    <CustomRowColumns rowContents={row.contents} section={SECTION_NAMES.LIVE_SOCIAL_SHIFTS} />
                  </TableRow>)}
              </>}
          </TableBody>
        </Table>
      </div>;
  };
  return <div className="space-y-6 digital-work-arrangement-view" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 digital-work-header">
        <h2 className="text-2xl font-bold mb-2 md:mb-0 flex items-center digital-work-title">
          <Calendar className="h-5 w-5 mr-2 text-blue-600 mx-[17px]" />
          סידור עבודה דיגיטל
        </h2>
        <div className="text-lg font-medium bg-blue-50 px-4 py-1.5 rounded-full text-blue-700 flex items-center digital-work-date">
          <Calendar className="h-4 w-4 mr-2" />
          {dateDisplay}
        </div>
      </div>

      {loading ? <div className="flex justify-center my-8 p-8 bg-white rounded-lg shadow-sm digital-loading">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
            <p className="text-lg">טוען נתונים...</p>
          </div>
        </div> : !arrangement ? <div className="flex justify-center my-8 p-8 bg-white rounded-lg shadow-sm digital-no-data">
          <div className="flex flex-col items-center">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
            <p className="text-lg">אין סידור עבודה לשבוע זה</p>
          </div>
        </div> : <Card className="border-none shadow-md overflow-hidden digital-work-card">
          <CardContent className="p-6">
            {renderWorkArrangementTable()}
            
            {arrangement.footer_text && <div className="digital-footer-text whitespace-pre-wrap mt-8 p-4 bg-gray-50 rounded-lg">
                {arrangement.footer_text}
              </div>}
          </CardContent>
        </Card>}
      
      <EditModeDialog isOpen={editModeOpen} onClose={() => {
      setEditModeOpen(false);
      // Ensure pointer-events is reset
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }} onEditCurrent={() => {
      console.log('Edit current arrangement');
      setEditModeOpen(false);
      // Ensure pointer-events is reset
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }} onEditAll={() => {
      console.log('Edit all future arrangements');
      setEditModeOpen(false);
      // Ensure pointer-events is reset
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }} />
    </div>;
};
export default DigitalWorkArrangementView;