import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EditModeDialog from './EditModeDialog';
import '@/styles/digital-work-arrangement.css';
import { Calendar, Clock } from 'lucide-react';
import { CustomRowColumns } from './workers/CustomRowColumns';
import { Worker } from '@/lib/supabase/workers';
import { getWorkArrangement, getShifts, getCustomRows } from '@/lib/api/digital-work-arrangements';
import type { DigitalWorkArrangement, DigitalShift, DigitalShiftCustomRow } from '@/lib/api/digital-work-arrangements';
import { Box, Typography, CircularProgress } from '@mui/material';

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts',
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
  night: 'לילה'
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
  selectedDate: Date;
  weekDate?: string;
  isEditable?: boolean;
}

const DigitalWorkArrangementView: React.FC<DigitalWorkArrangementViewProps> = ({
  selectedDate,
  weekDate,
  isEditable = false
}) => {
  const [arrangement, setArrangement] = useState<DigitalWorkArrangement | null>(null);
  const [shifts, setShifts] = useState<DigitalShift[]>([]);
  const [customRows, setCustomRows] = useState<DigitalShiftCustomRow[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModeOpen, setEditModeOpen] = useState(false);
  const {
    toast
  } = useToast();
  const [error, setError] = useState<string | null>(null);

  const selectedWeekDate = useMemo(() => {
    if (weekDate) {
      try {
        return parseISO(weekDate);
      } catch (error) {
        console.error("Error parsing date:", error);
      }
    }
    return selectedDate || new Date();
  }, [weekDate, selectedDate]);

  useEffect(() => {
    fetchArrangement();
    fetchDigitalWorkers();

    // Ensure pointer-events style is reset when component unmounts
    return () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, [selectedWeekDate]);

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
    const endDate = new Date(selectedWeekDate);
    endDate.setDate(endDate.getDate() + 5); // Friday
    const endDay = format(endDate, 'dd', {
      locale: he
    });
    const startDay = format(selectedWeekDate, 'dd', {
      locale: he
    });
    const month = format(selectedWeekDate, 'MMMM yyyy', {
      locale: he
    });
    return `${endDay}-${startDay} ב${month}`;
  }, [selectedWeekDate]);

  const fetchDigitalWorkers = async () => {
    try {
      // Get all workers and filter those who work in digital department
      const response = await fetch('/api/workers');
      const allWorkers = await response.json();
      const digitalWorkers = allWorkers.filter(worker => 
        worker.department && worker.department.includes('digital')
      );
      setWorkers(digitalWorkers || []);
    } catch (error) {
      console.error('Error fetching digital workers:', error);
    }
  };

  const fetchArrangement = async () => {
    setLoading(true);
    const weekStartStr = format(selectedWeekDate, 'yyyy-MM-dd');

    try {
      const arrangements = await getWorkArrangement(weekStartStr);
      
      const firstArrangement = arrangements[0];

      if (!firstArrangement) {

        setLoading(false);
        return;
      }

      console.log('Using arrangement:', firstArrangement);
      setArrangement(firstArrangement);

      const [shiftsData, customRowsData] = await Promise.all([
        getShifts(firstArrangement.id),
        getCustomRows(firstArrangement.id)
      ]);

      console.log('Fetched shifts:', shiftsData);
      console.log('Fetched custom rows:', customRowsData);

      // Process custom rows to ensure contents is properly formatted
      const processedCustomRows = customRowsData.map(row => {
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
          contents
        };
      });

      console.log('Processed custom rows:', processedCustomRows);
      setShifts(shiftsData);
      setCustomRows(processedCustomRows);
    } catch (error) {
      console.error('Error fetching digital work arrangement:', error);
      setError('Failed to load work arrangement data');
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
    const allShifts = shifts.filter(s => s.section_name === section && s.day_of_week === day && s.shift_type === shiftType && !s.is_hidden);
    return allShifts;
  };

  const getCustomRowsForSection = (section: string) => {
    return customRows.filter(row => row.section_name === section);
  };

  const renderShiftCell = (section: string, day: number, shiftType: string) => {
    const cellShifts = getShiftsForCell(section, day, shiftType);
    
    // Filter shifts to only show those with assigned workers
    const shiftsWithWorkers = cellShifts.filter(shift => 
      shift.person_name && 
      shift.person_name.trim() !== '' && 
      shift.person_name !== 'null'
    );
    
    if (shiftsWithWorkers.length === 0) {
      return <TableCell key={`empty-${section}-${day}-${shiftType}`} className={`p-2 border text-center digital-cell digital-cell-empty digital-cell-${section}`}></TableCell>;
    }
    
    return <TableCell key={`cell-${section}-${day}-${shiftType}`} className={`p-2 border digital-cell digital-cell-${section}`}>
        {shiftsWithWorkers.map(shift => <div key={`shift-${shift.id}`} className={`mb-2 digital-shift digital-shift-${section}`}>
            <div className={`digital-shift-time ${shift.is_custom_time ? 'digital-shift-custom-time digital-shift-irregular-hours' : ''} flex items-center justify-center`}>
              <div className="font-medium">
                {shift.start_time && shift.end_time ? `${shift.end_time.slice(0, 5)}-${shift.start_time.slice(0, 5)}` : shift.name || 'משמרת'}
              </div>
            </div>
            <div className="digital-shift-person mt-1 text-center">
              {getWorkerName(shift.person_name)}
              {shift.additional_text && (
                <div className="digital-shift-note text-sm mt-0.5 text-gray-600">
                  {shift.additional_text}
                </div>
              )}
            </div>
          </div>)}
      </TableCell>;
  };

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
            {shifts.some(shift => shift.section_name === SECTION_NAMES.DIGITAL_SHIFTS && shift.person_name && shift.person_name.trim() !== '' && shift.person_name !== 'null') && <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">
                    משמרות דיגיטל
                  </TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
              const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.DIGITAL_SHIFTS && shift.shift_type === type && shift.person_name && shift.person_name.trim() !== '' && shift.person_name !== 'null');
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
            {shifts.some(shift => shift.section_name === SECTION_NAMES.RADIO_NORTH && shift.person_name && shift.person_name.trim() !== '' && shift.person_name !== 'null') && <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">
                    רדיו צפון
                  </TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
              const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.RADIO_NORTH && shift.shift_type === type && shift.person_name && shift.person_name.trim() !== '' && shift.person_name !== 'null');
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
            {shifts.some(shift => shift.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && shift.person_name && shift.person_name.trim() !== '' && shift.person_name !== 'null') || customRows.some(row => row.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS) ? (
                <>
                <TableRow className="digital-section-title-row">
                  <TableCell colSpan={6} className="p-2 font-bold text-lg bg-gray-100 digital-section-title">משמרות תמלולים וכו'</TableCell>
                </TableRow>
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => {
                  const hasShifts = shifts.some(shift => shift.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && shift.shift_type === type && shift.person_name && shift.person_name.trim() !== '' && shift.person_name !== 'null');
                  if (!hasShifts) return null;
                  return <TableRow key={`row-trans-${type}`} className="bg-white hover:bg-gray-50 transition-colors digital-shift-row digital-transcription-shift-row">
                          {[0, 1, 2, 3, 4, 5].map(day => renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, type))}
                        </TableRow>;
                })}
                {getCustomRowsForSection(SECTION_NAMES.TRANSCRIPTION_SHIFTS).map(row => <TableRow key={`custom-row-trans-${row.id}`} className="bg-white hover:bg-gray-50 transition-colors digital-custom-row">
                    <CustomRowColumns rowContents={row.contents} section={SECTION_NAMES.TRANSCRIPTION_SHIFTS} />
                  </TableRow>)}
                </>
            ) : null}

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!arrangement) {
    return (
      <Box p={2}>
        <Typography>No work arrangement found for this week.</Typography>
      </Box>
    );
  }

  return <div className="space-y-6 digital-work-arrangement-view" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 digital-work-header">
        <h2 className="text-2xl font-bold mb-2 md:mb-0 flex items-center digital-work-title">
          <Calendar className="h-5 w-5 mr-2 text-blue-600 mx-[17px]" />
          סידור עבודה דיגיטל
        </h2>
        <div className="text-lg font-medium bg-blue-50 py-1.5 rounded-full text-blue-700 flex items-center digital-work-date px-[33px]">
          <Calendar className="h-4 w-4 mr-2 mx-[9px]" />
          {dateDisplay}
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden digital-work-card">
        <CardContent className="p-6">
          {renderWorkArrangementTable()}
          
          {arrangement.footer_text && <div className="digital-footer-text whitespace-pre-wrap mt-8 p-4 rounded-lg">
              {arrangement.footer_text}
            </div>}
        </CardContent>
      </Card>
      
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
