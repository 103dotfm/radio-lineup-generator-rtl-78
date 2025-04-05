
import React, { useState, useEffect } from 'react';
import { format, parse, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { DigitalWorkArrangement } from "@/types/schedule";

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
  comic_image_url: string | null;
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
              comic_image_url: firstArrangement.comic_image_url || null,
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
              comic_image_url: null,
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
            comic_image_url: null,
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
    if (!arrangement) return <TableCell className="digital-shift-cell p-2 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === section && 
      shift.day_of_week === day && 
      shift.shift_type === shiftType &&
      !shift.is_hidden
    );
    
    if (shifts.length === 0) {
      return <TableCell className={`digital-shift-cell digital-shift-empty digital-shift-empty-${section}-${day}-${shiftType} p-2 border text-center`} style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    }
    
    return (
      <TableCell className={`digital-shift-cell digital-shift-${section}-${day}-${shiftType} p-2 border text-center`} style={{ width: COLUMN_WIDTH }}>
        {shifts.map((shift) => (
          <div key={shift.id} className={`digital-shift-entry digital-shift-entry-${section}-${day}-${shiftType}-${shift.id} mb-1`}>
            <div className={`digital-shift-time flex justify-center mb-1 ${shift.is_custom_time ? 'digital-shift-custom-time font-bold' : ''}`}>
              <span dir="rtl">{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</span>
            </div>
            <div className={`digital-shift-content digital-shift-content-${section}-${day}-${shiftType}`}>
              {shift.person_name && (
                <span className="digital-shift-person font-bold">
                  {workerNames[shift.person_name] || shift.person_name}
                </span>
              )}
              {shift.additional_text && (
                <span className="digital-shift-note block text-sm">{shift.additional_text}</span>
              )}
              {!shift.person_name && !shift.additional_text && '-'}
            </div>
          </div>
        ))}
      </TableCell>
    );
  };

  const renderRadioNorthCell = (day: number) => {
    if (!arrangement) return <TableCell key={`radio-north-${day}`} className="digital-radio-cell p-2 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === SECTION_NAMES.RADIO_NORTH && 
      shift.day_of_week === day &&
      !shift.is_hidden
    );
    
    if (shifts.length === 0) {
      return <TableCell key={`radio-north-empty-${day}`} className={`digital-radio-cell digital-radio-empty digital-radio-empty-${day} p-2 border text-center`} style={{ width: COLUMN_WIDTH }}>-</TableCell>;
    }
    
    return (
      <TableCell key={`radio-north-${day}`} className={`digital-radio-cell digital-radio-${day} p-2 border text-center`} style={{ width: COLUMN_WIDTH }}>
        {shifts.map((shift) => (
          <div key={shift.id} className={`digital-radio-entry digital-radio-entry-${day}-${shift.id} mb-1`}>
            <div className={`digital-radio-time flex justify-center mb-1 ${shift.is_custom_time ? 'digital-radio-custom-time font-bold' : ''}`}>
              <span dir="rtl">{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</span>
            </div>
            <div className={`digital-radio-content digital-radio-content-${day}`}>
              {shift.person_name && (
                <span className="digital-radio-person font-bold">
                  {workerNames[shift.person_name] || shift.person_name}
                </span>
              )}
              {shift.additional_text && (
                <span className="digital-radio-note block text-sm">{shift.additional_text}</span>
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
    
    return rows.map((row, index) => (
      <TableRow key={row.id} className={`digital-custom-row digital-custom-row-${sectionName}-${index}`}>
        {[0, 1, 2, 3, 4, 5].map((dayIndex) => (
          <TableCell 
            key={`${row.id}-day-${dayIndex}`} 
            className={`digital-custom-cell digital-custom-cell-${sectionName}-${index}-${dayIndex} p-2 border text-center`} 
            style={{ width: COLUMN_WIDTH }}
          >
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
      <Card className="digital-work-arrangement-view digital-work-arrangement-loading">
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
      <Card className="digital-work-arrangement-view digital-work-arrangement-empty">
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
      <CardHeader className="digital-work-arrangement-header">
        <CardTitle className="digital-work-arrangement-title text-center">לוח משמרות דיגיטל</CardTitle>
        <div className="digital-work-arrangement-date-range text-center">{formatDateRange()}</div>
      </CardHeader>
      <CardContent className="digital-work-arrangement-content">
        <div className="space-y-6">
          <div className="digital-main-shifts-section bg-white rounded-md overflow-x-auto">
            <Table className="digital-main-shifts-table border">
              <TableHeader>
                <TableRow className="digital-main-shifts-header bg-black text-white">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <TableHead key={day} className={`digital-day-header digital-day-header-${index} text-center text-white border`} style={{ width: COLUMN_WIDTH }}>
                      <div className="digital-day-name">{day}</div>
                      <div className="digital-day-date text-sm">{weekDates[index]}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="digital-main-morning-row">
                  {[...Array(6)].map((_, day) => (
                    <React.Fragment key={`morning-${day}`}>
                      {renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.MORNING)}
                    </React.Fragment>
                  ))}
                </TableRow>
                <TableRow className="digital-main-afternoon-row">
                  {[...Array(6)].map((_, day) => (
                    <React.Fragment key={`afternoon-${day}`}>
                      {renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON)}
                    </React.Fragment>
                  ))}
                </TableRow>
                <TableRow className="digital-main-evening-row">
                  {[...Array(6)].map((_, day) => {
                    if (day === 5) {
                      return <TableCell key={`evening-${day}`} className="digital-shift-cell digital-shift-empty-evening-5 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
                    }
                    return (
                      <React.Fragment key={`evening-${day}`}>
                        {renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.EVENING)}
                      </React.Fragment>
                    );
                  })}
                </TableRow>
                {renderCustomRows(SECTION_NAMES.DIGITAL_SHIFTS)}
              </TableBody>
            </Table>
          </div>

          <div className="digital-radio-north-section overflow-x-auto">
            <div className="digital-radio-north-title font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.RADIO_NORTH]}</div>
            <Table className="digital-radio-north-table border">
              <TableBody>
                <TableRow className="digital-radio-north-row">
                  {[...Array(5)].map((_, day) => (
                    <React.Fragment key={`radio-north-${day}`}>
                      {renderRadioNorthCell(day)}
                    </React.Fragment>
                  ))}
                  <TableCell key="radio-north-empty-5" className="digital-radio-north-empty-cell border" style={{ width: COLUMN_WIDTH }}></TableCell>
                </TableRow>
                {renderCustomRows(SECTION_NAMES.RADIO_NORTH)}
              </TableBody>
            </Table>
          </div>

          <div className="digital-transcription-section overflow-x-auto">
            <div className="digital-transcription-title font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
            <Table className="digital-transcription-table border">
              <TableBody>
                <TableRow className="digital-transcription-morning-row">
                  {[...Array(6)].map((_, day) => (
                    <React.Fragment key={`transcription-morning-${day}`}>
                      {renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.MORNING)}
                    </React.Fragment>
                  ))}
                </TableRow>
                <TableRow className="digital-transcription-afternoon-row">
                  {[...Array(6)].map((_, day) => {
                    if (day === 5) {
                      return <TableCell key={`transcription-afternoon-${day}`} className="digital-transcription-afternoon-empty-5 border text-center" style={{ width: COLUMN_WIDTH }}>-</TableCell>;
                    }
                    return (
                      <React.Fragment key={`transcription-afternoon-${day}`}>
                        {renderShiftCell(SECTION_NAMES.TRANSCRIPTION_SHIFTS, day, SHIFT_TYPES.AFTERNOON)}
                      </React.Fragment>
                    );
                  })}
                </TableRow>
                {renderCustomRows(SECTION_NAMES.TRANSCRIPTION_SHIFTS)}
              </TableBody>
            </Table>
          </div>

          <div className="digital-social-section overflow-x-auto">
            <div className="digital-social-title font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
            <Table className="digital-social-table border">
              <TableBody>
                <TableRow className="digital-social-morning-row">
                  {[...Array(6)].map((_, day) => (
                    <React.Fragment key={`social-morning-${day}`}>
                      {renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.MORNING)}
                    </React.Fragment>
                  ))}
                </TableRow>
                <TableRow className="digital-social-afternoon-row">
                  {[...Array(6)].map((_, day) => {
                    if (day === 5) {
                      return <TableCell key={`live-social-afternoon-${day}`} className="digital-social-afternoon-empty-5 border text-center" style={{ width: COLUMN_WIDTH }}></TableCell>;
                    }
                    return (
                      <React.Fragment key={`social-afternoon-${day}`}>
                        {renderShiftCell(SECTION_NAMES.LIVE_SOCIAL_SHIFTS, day, SHIFT_TYPES.AFTERNOON)}
                      </React.Fragment>
                    );
                  })}
                </TableRow>
                {renderCustomRows(SECTION_NAMES.LIVE_SOCIAL_SHIFTS)}
              </TableBody>
            </Table>
          </div>

          {arrangement.comic_prompt && (
            <div className="digital-comic-prompt p-4 text-center border-t pt-6">
              <h3 className="font-bold text-lg mb-2 digital-comic-title">קומיקס השבוע</h3>
              <p className="digital-comic-text">{arrangement.comic_prompt}</p>
              
              {arrangement.comic_image_url && (
                <div className="digital-comic-image mt-4">
                  <img 
                    src={arrangement.comic_image_url} 
                    alt="Comic Sketch" 
                    className="digital-comic-image-content mx-auto max-h-[400px] max-w-full"
                  />
                </div>
              )}
            </div>
          )}

          {arrangement.footer_text && (
            <div className="digital-footer-text p-4 text-center min-h-[350px]">
              {arrangement.footer_text}
            </div>
          )}
          
          {arrangement.footer_image_url && (
            <div className="digital-footer-image flex justify-center">
              <img 
                src={arrangement.footer_image_url} 
                alt="Footer" 
                className="digital-footer-image-content max-h-[300px]"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DigitalWorkArrangementView;
