
import React, { useState, useEffect } from 'react';
import { format, parse, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

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
  comic_prompt: string | null;
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

// Define fixed column width
const COLUMN_WIDTH = "16.66%"; // 100% / 6 columns

interface DigitalWorkArrangementViewProps {
  weekDate?: string; // Format: 'yyyy-MM-dd'
}

const DigitalWorkArrangementView: React.FC<DigitalWorkArrangementViewProps> = ({ weekDate }) => {
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [workerNames, setWorkerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const dates = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + i);
      return format(date, 'dd/MM', { locale: he });
    });
    setWeekDates(dates);
  }, [currentWeek]);

  const formatDateRange = () => {
    const startDay = format(currentWeek, 'dd', { locale: he });
    const endDate = new Date(currentWeek);
    endDate.setDate(endDate.getDate() + 5); // Friday
    const endDay = format(endDate, 'dd', { locale: he });
    const month = format(currentWeek, 'MMMM yyyy', { locale: he });
    return `${endDay}-${startDay} ב${month}`;
  };

  useEffect(() => {
    // Fetch worker names for display
    const fetchWorkerNames = async () => {
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('id, name');
        
        if (!error && data) {
          const namesMap: Record<string, string> = {};
          data.forEach(worker => {
            namesMap[worker.id] = worker.name;
          });
          setWorkerNames(namesMap);
        }
      } catch (error) {
        console.error('Error fetching worker names:', error);
      }
    };
    
    fetchWorkerNames();
    fetchArrangement();
  }, [currentWeek]);

  const fetchArrangement = async () => {
    setIsLoading(true);
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');

    try {
      const { data: arrangementData, error: fetchError } = await supabase
        .from('work_arrangements')
        .select('*')
        .eq('type', 'digital')
        .eq('week_start', weekStartStr);

      if (fetchError) {
        throw fetchError;
      }

      if (arrangementData && arrangementData.length > 0) {
        try {
          const { data: digitalArrangement, error: digitalError } = await supabase
            .from('digital_work_arrangements')
            .select('*')
            .eq('week_start', weekStartStr);
            
          if (!digitalError && digitalArrangement && digitalArrangement.length > 0) {
            // Use the first arrangement if multiple exist
            const firstArrangement = digitalArrangement[0];
            
            const { data: shiftsData, error: shiftsError } = await supabase
              .from('digital_shifts')
              .select('*')
              .eq('arrangement_id', firstArrangement.id)
              .order('position', { ascending: true });
              
            if (shiftsError) throw shiftsError;
            
            const { data: customRowsData, error: customRowsError } = await supabase
              .from('digital_shift_custom_rows')
              .select('*')
              .eq('arrangement_id', firstArrangement.id)
              .order('position', { ascending: true });
              
            if (customRowsError) throw customRowsError;
            
            const processedCustomRows: CustomRow[] = (customRowsData || []).map(row => {
              let contents: Record<number, string> = {};
              
              try {
                if (row.contents) {
                  if (typeof row.contents === 'string') {
                    contents = JSON.parse(row.contents);
                  } else if (typeof row.contents === 'object') {
                    // Safely convert any type to string in the contents object
                    Object.entries(row.contents).forEach(([key, value]) => {
                      contents[Number(key)] = String(value || '');
                    });
                  }
                } else if (row.content) {
                  for (let i = 0; i < 6; i++) {
                    contents[i] = String(row.content || '');
                  }
                }
              } catch (e) {
                console.error('Error parsing contents', e);
              }
              
              return {
                id: row.id,
                section_name: row.section_name,
                contents,
                position: row.position
              };
            });
            
            const mappedShifts = shiftsData ? shiftsData.map(shift => ({
              ...shift,
              additional_text: shift.additional_text || ""
            })) : [];
            
            setArrangement({
              id: firstArrangement.id,
              week_start: firstArrangement.week_start,
              notes: firstArrangement.notes,
              footer_text: firstArrangement.footer_text,
              footer_image_url: firstArrangement.footer_image_url,
              comic_prompt: firstArrangement.comic_prompt || "",
              shifts: mappedShifts,
              custom_rows: processedCustomRows
            });
          } else {
            setArrangement({
              id: arrangementData[0].id,
              week_start: arrangementData[0].week_start,
              notes: null,
              footer_text: null,
              footer_image_url: null,
              comic_prompt: null,
              shifts: [],
              custom_rows: []
            });
          }
        } catch (error) {
          console.error('Error fetching digital arrangement details:', error);
          setArrangement({
            id: arrangementData[0].id,
            week_start: arrangementData[0].week_start,
            notes: null,
            footer_text: null,
            footer_image_url: null,
            comic_prompt: null,
            shifts: [],
            custom_rows: []
          });
        }
      } else {
        console.log("No digital work arrangement found for this week");
        setArrangement(null);
      }
    } catch (error) {
      console.error('Error fetching arrangement:', error);
      setArrangement(null);
    } finally {
      setIsLoading(false);
    }
  };

  const renderShiftCell = (section: string, day: number, shiftType: string) => {
    if (!arrangement) return <TableCell className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === section && 
      shift.day_of_week === day && 
      shift.shift_type === shiftType &&
      !shift.is_hidden
    );
    
    if (shifts.length === 0) {
      return <TableCell className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    }
    
    return (
      <TableCell className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>
        {shifts.map((shift) => (
          <div key={shift.id} className="mb-1">
            <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
              <span>{shift.end_time.substring(0, 5)} - {shift.start_time.substring(0, 5)}</span>
            </div>
            <div>
              {shift.person_name && (
                <span className="font-bold">
                  {workerNames[shift.person_name] || shift.person_name}
                </span>
              )}
              {shift.additional_text && (
                <span className="block text-sm">{shift.additional_text}</span>
              )}
              {!shift.person_name && !shift.additional_text && '-'}
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  const renderRadioNorthCell = (day: number) => {
    if (!arrangement) return <TableCell className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === SECTION_NAMES.RADIO_NORTH && 
      shift.day_of_week === day &&
      !shift.is_hidden
    );
    
    if (shifts.length === 0) {
      return <TableCell className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    }
    
    return (
      <TableCell className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>
        {shifts.map((shift) => (
          <div key={shift.id}>
            <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
              <span>{shift.end_time.substring(0, 5)} - {shift.start_time.substring(0, 5)}</span>
            </div>
            <div>
              {shift.person_name && (
                <span className="font-bold">
                  {workerNames[shift.person_name] || shift.person_name}
                </span>
              )}
              {shift.additional_text && (
                <span className="block text-sm">{shift.additional_text}</span>
              )}
              {!shift.person_name && !shift.additional_text && '-'}
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  const renderCustomRows = (sectionName: string) => {
    if (!arrangement) return null;
    
    const rows = arrangement.custom_rows.filter(row => row.section_name === sectionName);
    
    if (rows.length === 0) return null;
    
    return rows.map((row) => (
      <TableRow key={row.id}>
        {[0, 1, 2, 3, 4, 5].map((dayIndex) => (
          <TableCell key={`${row.id}-day-${dayIndex}`} className="p-2 border text-center" style={{ width: COLUMN_WIDTH }}>
            {renderTableCellContent(row, dayIndex)}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const renderTableCellContent = (customRow: CustomRow, columnIndex: number) => {
    if (customRow.contents && customRow.contents[columnIndex]) {
      return String(customRow.contents[columnIndex]);
    } else if ((customRow as any).content) {
      return String((customRow as any).content || '');
    } else {
      return "";
    }
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

  if (!arrangement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">לוח משמרות דיגיטל</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">אין סידור עבודה לשבוע זה</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="digital-work-arrangement-view" dir="rtl">
      <CardHeader>
        <CardTitle className="text-center">לוח משמרות דיגיטל</CardTitle>
        <div className="text-center">{formatDateRange()}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-white rounded-md overflow-x-auto">
            <Table className="border">
              <TableHeader>
                <TableRow className="bg-black text-white">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <TableHead key={day} className="text-center text-white border" style={{ width: COLUMN_WIDTH }}>
                      <div>{day}</div>
                      <div className="text-sm">{weekDates[index]}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.MORNING))}
                </TableRow>
                <TableRow>
                  {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON))}
                </TableRow>
                <TableRow>
                  {[...Array(6)].map((_, day) => {
                    if (day === 5) {
                      return <TableCell key={`evening-${day}`} className="border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
                    }
                    return renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.EVENING);
                  })}
                </TableRow>
                {renderCustomRows(SECTION_NAMES.DIGITAL_SHIFTS)}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-x-auto">
            <div className="font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.RADIO_NORTH]}</div>
            <Table className="border">
              <TableBody>
                <TableRow>
                  {[...Array(5)].map((_, day) => renderRadioNorthCell(day))}
                  <TableCell className="border" style={{ width: COLUMN_WIDTH }}></TableCell>
                </TableRow>
                {renderCustomRows(SECTION_NAMES.RADIO_NORTH)}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-x-auto">
            <div className="font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
            <Table className="border">
              <TableBody>
                <TableRow>
                  {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.MORNING))}
                </TableRow>
                <TableRow>
                  {[...Array(6)].map((_, day) => {
                    if (day === 5) {
                      return <TableCell key={`transcription-afternoon-${day}`} className="border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
                    }
                    return renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.AFTERNOON);
                  })}
                </TableRow>
                {renderCustomRows(SECTION_NAMES.TRANSCRIPTION_SHIFTS)}
              </TableBody>
            </Table>
          </div>

          <div className="overflow-x-auto">
            <div className="font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
            <Table className="border">
              <TableBody>
                <TableRow>
                  {[...Array(6)].map((_, day) => renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.MORNING))}
                </TableRow>
                <TableRow>
                  {[...Array(6)].map((_, day) => {
                    if (day === 5) {
                      return <TableCell key={`live-social-afternoon-${day}`} className="border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
                    }
                    return renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON);
                  })}
                </TableRow>
                {renderCustomRows(SECTION_NAMES.LIVE_SOCIAL_SHIFTS)}
              </TableBody>
            </Table>
          </div>

          {arrangement.footer_text && (
            <div className="p-4 text-center min-h-[350px]">
              {arrangement.footer_text}
            </div>
          )}
          {arrangement.footer_image_url && (
            <div className="flex justify-center">
              <img 
                src={arrangement.footer_image_url} 
                alt="Footer" 
                className="max-h-[300px]"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DigitalWorkArrangementView;
