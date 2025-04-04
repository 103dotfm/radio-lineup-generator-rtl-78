
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

  // Fetch arrangement
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
      } else {
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
    if (!arrangement) return <TableCell className="p-2 border text-center">-</TableCell>;
    
    // Find all visible shifts for this section, day and type
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === section && 
      shift.day_of_week === day && 
      shift.shift_type === shiftType &&
      !shift.is_hidden
    );
    
    // If no shifts, return empty cell
    if (shifts.length === 0) {
      return <TableCell className="p-2 border text-center">-</TableCell>;
    }
    
    // Render all shifts for this cell
    return (
      <TableCell className="p-2 border text-center">
        {shifts.map((shift) => (
          <div key={shift.id} className="mb-1">
            <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
              <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
            </div>
            <div>{shift.person_name || '-'}</div>
          </div>
        ))}
      </TableCell>
    );
  };

  const renderRadioNorthCell = (day: number) => {
    if (!arrangement) return <TableCell className="p-2 border text-center">-</TableCell>;
    
    const shifts = arrangement.shifts.filter(shift =>
      shift.section_name === SECTION_NAMES.RADIO_NORTH && 
      shift.day_of_week === day &&
      !shift.is_hidden
    );
    
    if (shifts.length === 0) {
      return <TableCell className="p-2 border text-center">-</TableCell>;
    }
    
    return (
      <TableCell className="p-2 border text-center">
        {shifts.map((shift) => (
          <div key={shift.id}>
            <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
              <span>{shift.end_time.substring(0, 5)}-{shift.start_time.substring(0, 5)}</span>
            </div>
            <div>{shift.person_name || '-'}</div>
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
        <TableCell colSpan={6} className="p-2 border text-center">
          {row.content}
        </TableCell>
      </TableRow>
    ));
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
    <Card className="digital-work-arrangement-view">
      <CardHeader>
        <CardTitle className="text-center">לוח משמרות דיגיטל</CardTitle>
        <div className="text-center">{formatDateRange()}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
                      return <TableCell key={`evening-${day}`} className="border text-center">-</TableCell>;
                    }
                    return renderShiftCell(SECTION_NAMES.DIGITAL_SHIFTS, day, SHIFT_TYPES.EVENING);
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Radio North Table */}
          <div className="overflow-x-auto">
            <div className="font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.RADIO_NORTH]}</div>
            <Table className="border">
              <TableBody>
                <TableRow>
                  {[...Array(5)].map((_, day) => renderRadioNorthCell(day))}
                  <TableCell className="border"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Transcription Shifts Table */}
          <div className="overflow-x-auto">
            <div className="font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
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
                      return <TableCell key={`transcription-afternoon-${day}`} className="border text-center">-</TableCell>;
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
            <div className="font-bold mb-2 text-center">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
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
                      return <TableCell key={`live-social-afternoon-${day}`} className="border text-center">-</TableCell>;
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
          {arrangement.footer_text && (
            <div className="p-4 text-center">
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
